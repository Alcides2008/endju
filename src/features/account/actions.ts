"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { PROVINCES } from "@/content/delivery";
import { getSession, type SessionUser } from "@/lib/auth/session";
import {
  customerCanCancel,
  INCLUDED_REVISIONS,
  statusAfterApproval,
  type ProofStatus,
} from "@/lib/domain/order-status";
import { isStaff } from "@/lib/domain/permissions";
import { toE164 } from "@/lib/domain/phone";
import { searchTokens } from "@/lib/domain/search";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { AUDIENCE, notifyRoles } from "@/features/admin/notify";
import { emailCustomer } from "@/features/messages/server";
import { startProductionSafely } from "@/features/admin/production-start";
import { PROOF_TERMS, PROOF_TERMS_VERSION } from "./terms";

export type ActionResult = { ok: true } | { ok: false; message: string };

async function customer(): Promise<SessionUser | null> {
  const user = await getSession();
  return user && !isStaff(user.role) ? user : null;
}

const SESSION_ENDED: ActionResult = { ok: false, message: "A tua sessão terminou. Entra outra vez." };

function audit(
  tx: FirebaseFirestore.Transaction,
  user: SessionUser,
  action: string,
  entity: { type: string; id: string; label: string },
  after?: Record<string, unknown>,
) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: user.name ?? user.email ?? "Cliente",
    actorRole: user.role,
    action,
    entity,
    after,
    at: Timestamp.now(),
  });
}

// ── Pedidos ─────────────────────────────────────────────────────────────────

/** O cliente cancela um pedido ainda em "recebido" e sem pagamentos (docs/04). */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const ref = adminDb().collection("orders").doc(orderId);
  try {
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.get("userId") !== user.uid) throw new Error("Pedido não encontrado.");
      if (!customerCanCancel({ status: snap.get("status"), paid: snap.get("totals.paid") ?? 0 })) {
        throw new Error("Este pedido já não pode ser cancelado aqui. Fala connosco.");
      }
      const at = Timestamp.now();
      tx.update(ref, {
        status: "cancelado",
        cancel: { reason: "Cancelado pelo cliente", by: user.uid, at },
        updatedAt: at,
        updatedBy: user.uid,
      });
      tx.set(ref.collection("events").doc(), {
        type: "status",
        visibility: "cliente",
        from: "recebido",
        to: "cancelado",
        message: "Pedido cancelado pelo cliente",
        actorId: user.uid,
        actorName: user.name ?? "Cliente",
        at,
      });
      // shortcut: o cupão usado não é libertado aqui; a reposição fica com o painel (Etapa 6)
      audit(tx, user, "order.cancelled", { type: "orders", id: ref.id, label: snap.get("number") });
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível cancelar." };
  }
  revalidatePath("/conta", "layout");
  return { ok: true };
}

// ── Provas ──────────────────────────────────────────────────────────────────

const commentSchema = z.object({
  proofId: z.string().min(1).max(64),
  body: z.string().trim().min(2, "Escreve o comentário.").max(1000),
  pin: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).nullable(),
});

export async function addProofComment(input: z.input<typeof commentSchema>): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ref = adminDb().collection("proofs").doc(parsed.data.proofId);
  const snap = await ref.get();
  if (!snap.exists || snap.get("userId") !== user.uid) return { ok: false, message: "Prova não encontrada." };
  if (snap.get("status") !== "pendente") return { ok: false, message: "Esta prova já foi respondida." };
  await ref.collection("comments").add({
    authorId: user.uid,
    authorName: user.name ?? "Cliente",
    authorKind: "cliente",
    body: parsed.data.body,
    page: 1,
    pin: parsed.data.pin ?? undefined,
    resolved: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
}

/** Pede alterações: prova → alteracoes_pedidas, pedido → em_design, revisionCount++ (docs/04). */
export async function requestProofChanges(proofId: string, message: string): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const body = message.trim();
  if (body.length < 5) return { ok: false, message: "Diz-nos o que mudar (pelo menos 5 caracteres)." };
  const db = adminDb();
  const proofRef = db.collection("proofs").doc(proofId);
  let done: { number: string; version: number };
  try {
    done = await db.runTransaction(async (tx) => {
      const proof = await tx.get(proofRef);
      if (!proof.exists || proof.get("userId") !== user.uid) throw new Error("Prova não encontrada.");
      if (proof.get("status") !== "pendente") throw new Error("Esta prova já foi respondida.");
      const orderRef = db.collection("orders").doc(proof.get("orderId"));
      const order = await tx.get(orderRef);
      const at = Timestamp.now();
      const revisions = (order.get("revisionCount") ?? 0) + 1;

      tx.update(proofRef, { status: "alteracoes_pedidas", updatedAt: at });
      tx.set(proofRef.collection("comments").doc(), {
        authorId: user.uid,
        authorName: user.name ?? "Cliente",
        authorKind: "cliente",
        body,
        page: 1,
        resolved: false,
        createdAt: at,
      });
      tx.update(orderRef.collection("items").doc(proof.get("itemId")), {
        proofStatus: "alteracoes" satisfies ProofStatus,
      });
      tx.update(orderRef, { status: "em_design", revisionCount: revisions, updatedAt: at, updatedBy: user.uid });
      tx.set(orderRef.collection("events").doc(), {
        type: "proof",
        visibility: "cliente",
        from: order.get("status"),
        to: "em_design",
        message: `Alterações pedidas na prova v${proof.get("version")}`,
        actorId: user.uid,
        actorName: user.name ?? "Cliente",
        at,
      });
      if (revisions > INCLUDED_REVISIONS) {
        tx.set(orderRef.collection("events").doc(), {
          type: "note",
          visibility: "interno",
          message: `Revisão ${revisions}: acima das ${INCLUDED_REVISIONS} incluídas. Avisar o cliente do custo antes de avançar.`,
          actorName: "Sistema",
          at,
        });
      }
      audit(tx, user, "proof.changes_requested", {
        type: "proofs",
        id: proofId,
        label: `${order.get("number")} v${proof.get("version")}`,
      });
      return { number: order.get("number") as string, version: proof.get("version") as number };
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível enviar." };
  }
  await notifyRoles(AUDIENCE.design, {
    event: "prova.decisao",
    title: `Alterações pedidas · ${done.number}`,
    body: `Prova v${done.version}: ${body.slice(0, 120)}`,
    link: `/admin/provas/${proofId}`,
  });
  revalidatePath("/conta", "layout");
  return { ok: true };
}

/**
 * Aprovação formal (docs/04 · Aprovação de prova): hora do servidor, IP, user agent e versão do texto aceite.
 * Com todas as provas aprovadas e o sinal pago, o pedido entra em produção.
 */
export async function approveProof(proofId: string, accepted: boolean, note: string): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  if (!accepted) return { ok: false, message: `Confirma: "${PROOF_TERMS}"` };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
  const userAgent = h.get("user-agent")?.slice(0, 300) ?? "desconhecido";
  const db = adminDb();
  const proofRef = db.collection("proofs").doc(proofId);
  let done: { orderId: string; number: string; version: number; status: string };
  try {
    done = await db.runTransaction(async (tx) => {
      const proof = await tx.get(proofRef);
      if (!proof.exists || proof.get("userId") !== user.uid) throw new Error("Prova não encontrada.");
      if (proof.get("status") !== "pendente") throw new Error("Esta prova já foi respondida.");
      const orderRef = db.collection("orders").doc(proof.get("orderId"));
      const [order, items] = await Promise.all([tx.get(orderRef), tx.get(orderRef.collection("items"))]);
      const at = Timestamp.now();
      const itemProofs = items.docs.map((item) =>
        item.id === proof.get("itemId") ? "aprovada" : (item.get("proofStatus") as ProofStatus),
      );
      const next = statusAfterApproval({
        itemProofs,
        paid: order.get("totals.paid") ?? 0,
        depositRequired: order.get("depositRequired") ?? 0,
      });

      tx.update(proofRef, {
        status: "aprovada",
        decision: {
          by: user.uid,
          byName: user.name ?? user.email ?? "Cliente",
          at,
          ip,
          userAgent,
          termsVersion: PROOF_TERMS_VERSION,
          note: note.trim() || undefined,
        },
        updatedAt: at,
      });
      tx.update(orderRef.collection("items").doc(proof.get("itemId")), {
        proofStatus: "aprovada" satisfies ProofStatus,
      });
      tx.update(orderRef, {
        status: next.status,
        awaitingDeposit: next.waitingDeposit,
        updatedAt: at,
        updatedBy: user.uid,
      });
      tx.set(orderRef.collection("events").doc(), {
        type: "proof",
        visibility: "cliente",
        from: order.get("status"),
        to: next.status,
        message:
          next.status === "em_producao"
            ? `Prova v${proof.get("version")} aprovada · em produção`
            : next.waitingDeposit
              ? `Prova v${proof.get("version")} aprovada · a aguardar o sinal`
              : `Prova v${proof.get("version")} aprovada`,
        actorId: user.uid,
        actorName: user.name ?? "Cliente",
        at,
      });
      audit(
        tx,
        user,
        "proof.approved",
        { type: "proofs", id: proofId, label: `${order.get("number")} v${proof.get("version")}` },
        { ip, termsVersion: PROOF_TERMS_VERSION },
      );
      return {
        orderId: orderRef.id,
        number: order.get("number") as string,
        version: proof.get("version") as number,
        status: next.status,
      };
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível aprovar." };
  }
  if (done.status === "em_producao") await startProductionSafely(done.orderId, user.uid);
  else await emailCustomer(done.orderId, "sinal.pendente");
  await notifyRoles([...AUDIENCE.design, "atendimento"], {
    event: "prova.decisao",
    title: `Prova aprovada · ${done.number}`,
    body:
      done.status === "em_producao"
        ? `v${done.version} aprovada: o pedido entrou em produção.`
        : `v${done.version} aprovada, a aguardar o sinal.`,
    link: `/admin/pedidos/${done.number}`,
  });
  revalidatePath("/conta", "layout");
  return { ok: true };
}

// ── Orçamentos ──────────────────────────────────────────────────────────────

/** Aceita ou recusa a proposta enviada pela Endju; a conversão em pedido é feita pela equipa no painel. */
export async function respondQuote(quoteId: string, accept: boolean): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const ref = adminDb().collection("quotes").doc(quoteId);
  let number: string;
  try {
    number = await adminDb().runTransaction(async (tx) => {
      const quote = await tx.get(ref);
      if (!quote.exists || quote.get("userId") !== user.uid) throw new Error("Orçamento não encontrado.");
      if (quote.get("status") !== "enviado") throw new Error("Esta proposta já não está à espera de resposta.");
      const validUntil = (quote.get("validUntil") as Timestamp | undefined)?.toDate();
      if (validUntil && validUntil < new Date()) throw new Error("A proposta expirou. Pede uma nova.");
      const at = Timestamp.now();
      tx.update(ref, { status: accept ? "aceite" : "recusado", respondedAt: at, updatedAt: at });
      audit(tx, user, accept ? "quote.accepted" : "quote.refused", {
        type: "quotes",
        id: ref.id,
        label: quote.get("number"),
      });
      return quote.get("number") as string;
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível responder." };
  }
  await notifyRoles(AUDIENCE.sales, {
    event: "orcamento.novo",
    title: accept ? `Proposta ${number} aceite` : `Proposta ${number} recusada`,
    body: accept ? "Converte-a em pedido no painel." : `${user.name ?? "O cliente"} recusou a proposta.`,
    link: `/admin/orcamentos/${quoteId}`,
  });
  revalidatePath("/conta", "layout");
  return { ok: true };
}

// ── Perfil, moradas e notificações ──────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().trim().min(2, "Indica o teu nome.").max(80),
  phone: z.string().transform((value, ctx) => {
    const e164 = toE164(value);
    if (!e164) ctx.addIssue({ code: "custom", message: "Número inválido. Ex.: 923 456 789" });
    return e164 ?? "";
  }),
  type: z.enum(["particular", "empresa"]),
  company: z.string().trim().max(120),
  nif: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^[0-9A-Z]{9,14}$/i.test(v), "NIF inválido."),
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { name, phone, type, company, nif } = parsed.data;
  try {
    // O telemóvel é único no Firebase Auth: é aqui que se apanha um número já usado noutra conta
    await adminAuth().updateUser(user.uid, { displayName: name, phoneNumber: phone });
  } catch (error) {
    const code = (error as { code?: string }).code;
    return {
      ok: false,
      message:
        code === "auth/phone-number-already-exists"
          ? "Este telemóvel já está associado a outra conta."
          : "Não foi possível guardar.",
    };
  }
  const db = adminDb();
  const now = FieldValue.serverTimestamp();
  await db.collection("users").doc(user.uid).set({ displayName: name, phone, updatedAt: now }, { merge: true });
  const customerSnap = await db.collection("customers").where("userIds", "array-contains", user.uid).limit(1).get();
  const customerName = type === "empresa" && company ? company : name;
  if (customerSnap.docs[0]) {
    await customerSnap.docs[0].ref.update({
      type,
      name: customerName,
      nif: nif || FieldValue.delete(),
      phone,
      searchTokens: searchTokens(customerName, phone, nif, user.email),
      updatedAt: now,
    });
  }
  revalidatePath("/conta", "layout");
  return { ok: true };
}

const addressSchema = z.object({
  id: z.string().max(40).optional(),
  label: z.string().trim().min(2, "Dá um nome à morada (ex.: Escritório).").max(40),
  recipient: z.string().trim().min(2, "Indica quem recebe.").max(120),
  phone: z.string().transform((value, ctx) => {
    const e164 = toE164(value);
    if (!e164) ctx.addIssue({ code: "custom", message: "Número inválido. Ex.: 923 456 789" });
    return e164 ?? "";
  }),
  province: z.enum(PROVINCES, "Escolhe a província."),
  municipality: z.string().trim().min(2, "Indica o município.").max(80),
  neighborhood: z.string().trim().min(2, "Indica o bairro.").max(80),
  street: z.string().trim().min(2, "Indica a rua e o número.").max(160),
  reference: z.string().trim().max(160),
  isDefault: z.boolean(),
});

export type AddressInput = z.input<typeof addressSchema>;

async function customerRef(user: SessionUser) {
  const db = adminDb();
  const snap = await db.collection("customers").where("userIds", "array-contains", user.uid).limit(1).get();
  if (snap.docs[0]) return snap.docs[0].ref;
  // Primeira morada antes da primeira encomenda: cria a ficha de cliente
  const ref = db.collection("customers").doc();
  const profile = (await db.collection("users").doc(user.uid).get()).data();
  const name = (profile?.displayName as string | undefined) ?? user.name ?? "Cliente";
  const phone = (profile?.phone as string | undefined) ?? user.phone ?? "";
  await ref.set({
    type: "particular",
    segment: "particular",
    name,
    email: user.email,
    phone,
    contacts: [],
    addresses: [],
    tags: [],
    userIds: [user.uid],
    paymentTerms: "sinal_50",
    stats: { ordersCount: 0, totalSpent: 0, balanceDue: 0 },
    searchTokens: searchTokens(name, phone, user.email),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref;
}

export async function saveAddress(input: AddressInput): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ref = await customerRef(user);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.get("addresses") as (AddressInput & { id: string })[] | undefined) ?? [];
    const address = { ...parsed.data, id: parsed.data.id ?? crypto.randomUUID().slice(0, 8) };
    let next = current.some((a) => a.id === address.id)
      ? current.map((a) => (a.id === address.id ? address : a))
      : [...current, address];
    if (address.isDefault || next.length === 1) next = next.map((a) => ({ ...a, isDefault: a.id === address.id }));
    tx.update(ref, { addresses: next, updatedAt: Timestamp.now() });
  });
  revalidatePath("/conta/moradas");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const ref = await customerRef(user);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.get("addresses") as { id: string; isDefault: boolean }[] | undefined) ?? [];
    let next = current.filter((a) => a.id !== id);
    if (next.length && !next.some((a) => a.isDefault)) next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
    tx.update(ref, { addresses: next, updatedAt: Timestamp.now() });
  });
  revalidatePath("/conta/moradas");
  return { ok: true };
}

const prefsSchema = z.object({ email: z.boolean(), whatsapp: z.boolean(), marketing: z.boolean() });

export async function savePreferences(input: z.input<typeof prefsSchema>): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Preferências inválidas." };
  await adminDb()
    .collection("users")
    .doc(user.uid)
    .set({ notificationPrefs: parsed.data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  revalidatePath("/conta/notificacoes");
  return { ok: true };
}

// ── Mensagens de suporte ────────────────────────────────────────────────────

const threadSchema = z.object({
  subject: z.string().trim().min(3, "Indica o assunto.").max(120),
  body: z.string().trim().min(5, "Escreve a mensagem.").max(3000),
  orderNumber: z.string().trim().max(30),
});

export async function createThread(
  input: z.input<typeof threadSchema>,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const user = await customer();
  if (!user) return SESSION_ENDED as { ok: false; message: string };
  const parsed = threadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const db = adminDb();
  const ref = db.collection("threads").doc();
  const at = Timestamp.now();
  const batch = db.batch();
  batch.set(ref, {
    userId: user.uid,
    customerName: user.name ?? user.email ?? "Cliente",
    subject: parsed.data.subject,
    orderNumber: parsed.data.orderNumber || undefined,
    status: "aberta",
    lastMessageAt: at,
    unreadByTeam: true,
    unreadByCustomer: false,
    createdAt: at,
    updatedAt: at,
  });
  batch.set(ref.collection("messages").doc(), {
    authorId: user.uid,
    authorName: user.name ?? "Cliente",
    authorKind: "cliente",
    body: parsed.data.body,
    fileIds: [],
    createdAt: at,
  });
  await batch.commit();
  await notifyRoles(AUDIENCE.sales, {
    event: "mensagem.nova",
    title: `Mensagem nova: ${parsed.data.subject}`,
    body: `${user.name ?? "Cliente"}: ${parsed.data.body.slice(0, 120)}`,
    link: `/admin/mensagens/${ref.id}`,
  });
  revalidatePath("/conta/mensagens");
  return { ok: true, id: ref.id };
}

export async function sendThreadMessage(threadId: string, body: string): Promise<ActionResult> {
  const user = await customer();
  if (!user) return SESSION_ENDED;
  const text = body.trim();
  if (text.length < 1 || text.length > 3000) return { ok: false, message: "Escreve a mensagem." };
  const ref = adminDb().collection("threads").doc(threadId);
  const snap = await ref.get();
  if (!snap.exists || snap.get("userId") !== user.uid) return { ok: false, message: "Conversa não encontrada." };
  const at = Timestamp.now();
  const batch = adminDb().batch();
  batch.set(ref.collection("messages").doc(), {
    authorId: user.uid,
    authorName: user.name ?? "Cliente",
    authorKind: "cliente",
    body: text,
    fileIds: [],
    createdAt: at,
  });
  batch.update(ref, { status: "aberta", lastMessageAt: at, unreadByTeam: true, updatedAt: at });
  await batch.commit();
  await notifyRoles(AUDIENCE.sales, {
    event: "mensagem.nova",
    title: `Resposta do cliente: ${snap.get("subject")}`,
    body: `${user.name ?? "Cliente"}: ${text.slice(0, 120)}`,
    link: `/admin/mensagens/${threadId}`,
  });
  return { ok: true };
}

/** Marca como lida a resposta da equipa quando o cliente abre a conversa. */
export async function markThreadRead(threadId: string) {
  const user = await customer();
  if (!user) return;
  const ref = adminDb().collection("threads").doc(threadId);
  const snap = await ref.get();
  if (snap.exists && snap.get("userId") === user.uid && snap.get("unreadByCustomer")) {
    await ref.update({ unreadByCustomer: false });
  }
}
