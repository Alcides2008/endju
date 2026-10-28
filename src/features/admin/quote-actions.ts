"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import { formatKz } from "@/lib/domain/money";
import { addWorkingDays, orderTotals, quoteTotals, vatIncluded } from "@/lib/domain/pricing";
import { searchTokens } from "@/lib/domain/search";
import { adminDb } from "@/lib/firebase/admin";
import { nextNumber } from "@/lib/firebase/counters";
import { getCommerce } from "@/features/settings/server";
import { NO_PERMISSION, staffCan } from "./guard";
import { AUDIENCE, notifyRoles, notifyUser } from "./notify";
import type { QuoteLine } from "./quotes";

export type QuoteResult = { ok: true; number?: string } | { ok: false; message: string };

const TAX_RATE = 14;
const actorName = (user: SessionUser) => user.name ?? user.email ?? "Equipa";

function audit(
  tx: FirebaseFirestore.Transaction,
  user: SessionUser,
  action: string,
  id: string,
  label: string,
  after?: object,
) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action,
    entity: { type: "quotes", id, label },
    after,
    at: Timestamp.now(),
  });
}

function refresh(id: string) {
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${id}`);
}

/** Atribui o orçamento; um orçamento novo passa a "em análise" (docs/04 · Estado do orçamento). */
export async function assignQuote(quoteId: string, assigneeId: string): Promise<QuoteResult> {
  const user = await staffCan("quotes", "edit");
  if (!user) return NO_PERMISSION;
  const ref = adminDb().collection("quotes").doc(quoteId);
  try {
    await adminDb().runTransaction(async (tx) => {
      const quote = await tx.get(ref);
      if (!quote.exists) throw new Error("Orçamento não encontrado.");
      const moves = quote.get("status") === "novo" && assigneeId;
      tx.update(ref, {
        assigneeId: assigneeId || null,
        ...(moves ? { status: "em_analise" } : {}),
        updatedAt: Timestamp.now(),
      });
      audit(tx, user, "quote.assigned", ref.id, quote.get("number"), { assigneeId });
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível atribuir." };
  }
  if (assigneeId && assigneeId !== user.uid) {
    await notifyUser(assigneeId, {
      event: "tarefa.atribuida",
      title: "Tens um orçamento atribuído",
      body: "Abre para preparar a proposta.",
      link: `/admin/orcamentos/${quoteId}`,
    });
  }
  refresh(quoteId);
  return { ok: true };
}

const versionSchema = z.object({
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(2, "Descreve cada linha.").max(200),
        quantity: z.number().int().min(1, "Quantidade inválida.").max(1_000_000),
        unitPrice: z.number().int().min(1, "Indica o preço de cada linha.").max(100_000_000_000),
      }),
    )
    .min(1, "A proposta precisa de pelo menos uma linha.")
    .max(30),
  discount: z.number().int().min(0),
  validDays: z.number().int().min(1).max(90),
  terms: z.string().trim().min(10, "Escreve as condições.").max(2000),
  notes: z.string().trim().max(1000),
});

export type QuoteVersionInput = z.input<typeof versionSchema>;

/**
 * Cria a versão n+1 da proposta e envia-a ao cliente: estado "enviado", validade e total no orçamento.
 * Cada versão fica guardada; o cliente vê sempre a atual.
 */
export async function sendQuoteVersion(quoteId: string, input: QuoteVersionInput): Promise<QuoteResult> {
  const user = await staffCan("quotes", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { lines, discount, validDays, terms, notes } = parsed.data;
  const totals = quoteTotals(lines, discount, TAX_RATE);
  if (totals.total <= 0) return { ok: false, message: "O desconto não pode ser maior que o total." };

  const db = adminDb();
  const ref = db.collection("quotes").doc(quoteId);
  try {
    const done = await db.runTransaction(async (tx) => {
      const quote = await tx.get(ref);
      if (!quote.exists) throw new Error("Orçamento não encontrado.");
      if (quote.get("status") === "convertido") throw new Error("Este orçamento já foi convertido em pedido.");
      const version = ((quote.get("currentVersion") as number) ?? 0) + 1;
      const at = Timestamp.now();
      const validUntil = Timestamp.fromDate(new Date(Date.now() + validDays * 86_400_000));
      tx.set(ref.collection("versions").doc(String(version)), {
        version,
        lines: lines.map((line): QuoteLine => ({ ...line, taxRate: TAX_RATE })),
        totals,
        terms,
        notes: notes || undefined,
        validUntil,
        authorId: user.uid,
        authorName: actorName(user),
        createdAt: at,
      });
      tx.update(ref, {
        status: "enviado",
        currentVersion: version,
        validUntil,
        total: totals.total,
        sentAt: at,
        respondedAt: null,
        assigneeId: quote.get("assigneeId") ?? user.uid,
        updatedAt: at,
      });
      audit(tx, user, "quote.sent", ref.id, `${quote.get("number")} v${version}`, { total: totals.total });
      return { number: quote.get("number") as string, userId: quote.get("userId") as string | undefined, version };
    });
    if (done.userId) {
      await notifyUser(done.userId, {
        event: "orcamento.enviado",
        title: `Proposta ${done.number} pronta`,
        body: `v${done.version} · ${formatKz(totals.total)}`,
        link: `/conta/orcamentos/${quoteId}`,
      });
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível enviar a proposta." };
  }
  refresh(quoteId);
  revalidatePath(`/conta/orcamentos/${quoteId}`);
  return { ok: true };
}

/**
 * Converte a proposta atual em pedido (docs/04 · aceite → convertido): número EDJ, ficha de cliente
 * (existente ou nova), itens com as linhas da versão, evento e auditoria, tudo na mesma transação.
 * Aceita "enviado" para quando o cliente aceita por telefone ou WhatsApp.
 */
export async function convertQuote(quoteId: string): Promise<QuoteResult> {
  const user = await staffCan("quotes", "approve");
  if (!user) return NO_PERMISSION;
  const commerce = await getCommerce();
  const db = adminDb();
  const quoteRef = db.collection("quotes").doc(quoteId);
  const first = await quoteRef.get();
  if (!first.exists) return { ok: false, message: "Orçamento não encontrado." };
  const userId = first.get("userId") as string | undefined;
  const knownCustomerId =
    (first.get("customerId") as string | undefined) ??
    (userId
      ? (await db.collection("customers").where("userIds", "array-contains", userId).limit(1).get()).docs[0]?.id
      : undefined);
  const customerRef = knownCustomerId
    ? db.collection("customers").doc(knownCustomerId)
    : db.collection("customers").doc();
  const orderRef = db.collection("orders").doc();
  const now = new Date();

  try {
    const done = await db.runTransaction(async (tx) => {
      const quote = await tx.get(quoteRef);
      const status = quote.get("status") as string;
      if (status === "convertido") throw new Error("Este orçamento já foi convertido em pedido.");
      if (status !== "enviado" && status !== "aceite") throw new Error("Converte só propostas enviadas ou aceites.");
      const [version, customer] = await Promise.all([
        tx.get(quoteRef.collection("versions").doc(String(quote.get("currentVersion")))),
        tx.get(customerRef),
      ]);
      if (!version.exists) throw new Error("A proposta ainda não tem versão.");
      const orderNumber = await nextNumber(tx, "orders", "EDJ", now);

      const lines = (version.get("lines") as QuoteLine[]).map((line) => {
        const lineTotal = line.quantity * line.unitPrice;
        return { ...line, lineTotal, lineTax: vatIncluded(lineTotal, line.taxRate) };
      });
      const depositPct = customer.get("paymentTerms") === "a_30_dias" ? 0 : commerce.depositPct;
      const totals = orderTotals({
        lines,
        discount: (version.get("totals.discount") as number) ?? 0,
        delivery: 0,
        taxRate: TAX_RATE,
        depositPct,
      });
      const contact = quote.get("contact") as { name: string; phone: string; email?: string; company?: string };
      const at = Timestamp.fromDate(now);
      const meta = { createdAt: at, updatedAt: at, createdBy: user.uid, updatedBy: user.uid };

      if (!customer.exists) {
        const type = contact.company ? "empresa" : "particular";
        tx.set(customerRef, {
          type,
          segment: type,
          name: contact.company || contact.name,
          email: contact.email,
          phone: contact.phone,
          contacts: contact.company ? [{ name: contact.name, phone: contact.phone, email: contact.email }] : [],
          addresses: [],
          tags: ["orcamento"],
          userIds: userId ? [userId] : [],
          paymentTerms: "sinal_50",
          stats: { ordersCount: 0, totalSpent: 0, balanceDue: 0 },
          searchTokens: searchTokens(contact.company, contact.name, contact.phone, contact.email),
          ...meta,
        });
      }
      const snapshot = {
        name: (customer.get("name") as string | undefined) ?? (contact.company || contact.name),
        nif: customer.get("nif") as string | undefined,
        phone: (customer.get("phone") as string | undefined) ?? contact.phone,
        email: (customer.get("email") as string | undefined) ?? contact.email,
        type: (customer.get("type") as string | undefined) ?? (contact.company ? "empresa" : "particular"),
      };
      const deadline = (quote.get("request.deadline") as Timestamp | undefined)?.toDate();

      tx.set(orderRef, {
        number: orderNumber,
        customerId: customerRef.id,
        userId,
        customer: snapshot,
        channel: "orcamento",
        quoteId: quoteRef.id,
        status: "recebido",
        paymentStatus: "pendente",
        priority: "normal",
        itemsSummary: { count: lines.length, names: lines.map((line) => line.description) },
        totals: { ...totals, paid: 0, due: totals.total },
        depositRequired: totals.depositRequired,
        // shortcut: levantamento na loja por omissão; a entrega combina-se com o cliente e ajusta-se à mão
        delivery: { method: "levantamento", pickupPointId: commerce.pickupPoints[0].id, fee: 0 },
        dueAt: Timestamp.fromDate(deadline && deadline > now ? deadline : addWorkingDays(now, 7)),
        needsDesign: true,
        revisionCount: 0,
        customerNotes: quote.get("request.description"),
        searchTokens: searchTokens(orderNumber, snapshot.name, snapshot.phone, snapshot.nif),
        ...meta,
      });
      for (const line of lines) {
        tx.set(orderRef.collection("items").doc(), {
          productId: "personalizado",
          name: line.description,
          options: [],
          quantity: line.quantity,
          urgent: false,
          design: "endju_cria",
          artworkFileIds: [],
          unitPrice: line.unitPrice,
          lineSubtotal: line.lineTotal - line.lineTax,
          taxRate: line.taxRate,
          lineTax: line.lineTax,
          lineTotal: line.lineTotal,
          priceBreakdown: [],
          proofStatus: "pendente",
          createdAt: at,
        });
      }
      tx.set(orderRef.collection("events").doc(), {
        type: "status",
        visibility: "cliente",
        to: "recebido",
        message: `Pedido criado a partir da proposta ${quote.get("number")}`,
        actorId: user.uid,
        actorName: actorName(user),
        at,
      });
      tx.update(quoteRef, {
        status: "convertido",
        orderId: orderRef.id,
        orderNumber,
        customerId: customerRef.id,
        updatedAt: at,
      });
      audit(tx, user, "quote.converted", quoteRef.id, quote.get("number"), { orderNumber, total: totals.total });
      return { orderNumber, total: totals.total, name: snapshot.name };
    });

    if (userId) {
      await notifyUser(userId, {
        event: "pedido.novo",
        title: `Pedido ${done.orderNumber} criado`,
        body: "A tua proposta passou a pedido. Segue-o aqui.",
        link: `/conta/pedidos/${done.orderNumber}`,
      });
    }
    await notifyRoles(
      AUDIENCE.design,
      {
        event: "pedido.novo",
        title: `Novo pedido ${done.orderNumber}`,
        body: `${done.name} · ${formatKz(done.total)} · de orçamento`,
        link: `/admin/pedidos/${done.orderNumber}`,
      },
      user.uid,
    );
    refresh(quoteId);
    revalidatePath("/admin/pedidos");
    return { ok: true, number: done.orderNumber };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível converter." };
  }
}
