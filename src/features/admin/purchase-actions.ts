"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import { formatKz } from "@/lib/domain/money";
import { toE164 } from "@/lib/domain/phone";
import {
  MATERIAL_CATEGORIES,
  payableStatus,
  purchaseTotals,
  receivedStatus,
  roundQty,
  type PurchaseOrderStatus,
} from "@/lib/domain/stock";
import { adminDb } from "@/lib/firebase/admin";
import { nextNumber } from "@/lib/firebase/counters";
import { NO_PERMISSION, staffCan } from "./guard";
import type { PurchaseLine } from "./purchasing";
import { moveStock, warnLowStock, type LowStock } from "./stock-ledger";

export type PurchaseResult = { ok: true; id?: string } | { ok: false; message: string };

const actorName = (user: SessionUser) => user.name ?? user.email ?? "Equipa";
const fail = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof Error ? error.message : fallback,
});

function audit(
  tx: FirebaseFirestore.Transaction,
  user: SessionUser,
  action: string,
  entity: { type: "suppliers" | "purchaseOrders"; id: string; label: string },
  after: object,
) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action,
    entity,
    after,
    at: Timestamp.now(),
  });
}

// ── Fornecedores ────────────────────────────────────────────────────────────

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Indica o nome do fornecedor.").max(120),
  nif: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^[0-9A-Z]{9,14}$/i.test(v), "NIF inválido."),
  contactName: z.string().trim().max(80),
  phone: z.string().transform((value, ctx) => {
    if (!value.trim()) return "";
    const e164 = toE164(value);
    if (!e164) ctx.addIssue({ code: "custom", message: "Telefone inválido. Ex.: 923 456 789" });
    return e164 ?? "";
  }),
  email: z.union([z.literal(""), z.email("Email inválido.")]),
  categories: z.array(z.enum(MATERIAL_CATEGORIES)).max(MATERIAL_CATEGORIES.length),
  paymentTermsDays: z.number().int().min(0).max(180),
  iban: z.string().trim().toUpperCase().max(34),
  address: z.string().trim().max(200),
  rating: z.number().int().min(0).max(5),
  notes: z.string().trim().max(1000),
  active: z.boolean(),
});

export type SupplierInput = z.input<typeof supplierSchema>;

function supplierFields(data: z.output<typeof supplierSchema>) {
  return {
    name: data.name,
    nif: data.nif || null,
    // shortcut: um contacto por fornecedor no formulário; o modelo (docs/02) já guarda uma lista
    contacts: [
      {
        name: data.contactName,
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.email ? { email: data.email } : {}),
      },
    ],
    categories: [...new Set(data.categories)],
    paymentTermsDays: data.paymentTermsDays,
    iban: data.iban || null,
    address: data.address || null,
    rating: data.rating || null,
    notes: data.notes || null,
    active: data.active,
  };
}

export async function createSupplier(input: SupplierInput): Promise<PurchaseResult> {
  const user = await staffCan("purchasing", "create");
  if (!user) return NO_PERMISSION;
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ref = adminDb().collection("suppliers").doc();
  const at = Timestamp.now();
  await adminDb().runTransaction(async (tx) => {
    tx.set(ref, { ...supplierFields(parsed.data), createdAt: at, updatedAt: at, createdBy: user.uid });
    audit(tx, user, "supplier.created", { type: "suppliers", id: ref.id, label: parsed.data.name }, {});
  });
  revalidatePath("/admin/compras", "layout");
  return { ok: true, id: ref.id };
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<PurchaseResult> {
  const user = await staffCan("purchasing", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ref = adminDb().collection("suppliers").doc(id);
  try {
    await adminDb().runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists) throw new Error("Fornecedor não encontrado.");
      tx.update(ref, { ...supplierFields(parsed.data), updatedAt: Timestamp.now(), updatedBy: user.uid });
      audit(
        tx,
        user,
        "supplier.updated",
        { type: "suppliers", id, label: parsed.data.name },
        {
          paymentTermsDays: parsed.data.paymentTermsDays,
          active: parsed.data.active,
        },
      );
    });
  } catch (error) {
    return fail(error, "Não foi possível guardar.");
  }
  revalidatePath("/admin/compras", "layout");
  return { ok: true };
}

// ── Encomendas de compra ────────────────────────────────────────────────────

const poSchema = z.object({
  supplierId: z.string().min(1, "Escolhe o fornecedor."),
  lines: z
    .array(
      z.object({
        materialId: z.string().min(1, "Escolhe o material de cada linha."),
        qty: z.number().finite().positive("Indica a quantidade de cada linha.").max(1_000_000).transform(roundQty),
        unitCost: z.number().int().min(0).max(1_000_000_000),
      }),
    )
    .min(1, "Junta pelo menos uma linha.")
    .max(40)
    .refine((lines) => new Set(lines.map((l) => l.materialId)).size === lines.length, "Há materiais repetidos."),
  expectedAt: z.union([z.literal(""), z.iso.date()]),
  notes: z.string().trim().max(1000),
});

export type PurchaseOrderInput = z.input<typeof poSchema>;

/** Lê fornecedor e materiais e monta as linhas (a descrição vem do nome do material). */
async function buildOrder(tx: FirebaseFirestore.Transaction, data: z.output<typeof poSchema>) {
  const db = adminDb();
  const [supplier, ...materials] = await Promise.all([
    tx.get(db.collection("suppliers").doc(data.supplierId)),
    ...data.lines.map((l) => tx.get(db.collection("materials").doc(l.materialId))),
  ]);
  if (!supplier.exists || supplier.get("active") === false) throw new Error("Fornecedor inválido.");
  const lines: PurchaseLine[] = data.lines.map((line, i) => {
    if (!materials[i].exists) throw new Error("Um dos materiais já não existe.");
    return { ...line, description: materials[i].get("name"), receivedQty: 0 };
  });
  return {
    supplier,
    fields: {
      supplierId: supplier.id,
      supplierName: supplier.get("name") as string,
      lines,
      totals: purchaseTotals(lines),
      expectedAt: data.expectedAt ? Timestamp.fromDate(new Date(`${data.expectedAt}T12:00:00+01:00`)) : null,
      notes: data.notes || null,
    },
  };
}

export async function createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseResult> {
  const user = await staffCan("purchasing", "create");
  if (!user) return NO_PERMISSION;
  const parsed = poSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const db = adminDb();
  const ref = db.collection("purchaseOrders").doc();
  try {
    await db.runTransaction(async (tx) => {
      const { fields } = await buildOrder(tx, parsed.data);
      const number = await nextNumber(tx, "purchaseOrders", "OC"); // já escreve: fica depois das leituras
      const at = Timestamp.now();
      tx.set(ref, {
        number,
        ...fields,
        status: "rascunho" satisfies PurchaseOrderStatus,
        payable: { dueAt: null, paid: 0, status: "por_pagar" },
        createdAt: at,
        updatedAt: at,
        createdBy: user.uid,
      });
      audit(
        tx,
        user,
        "purchase.created",
        { type: "purchaseOrders", id: ref.id, label: number },
        {
          total: fields.totals.total,
        },
      );
    });
  } catch (error) {
    return fail(error, "Não foi possível criar a encomenda.");
  }
  revalidatePath("/admin/compras", "layout");
  return { ok: true, id: ref.id };
}

export async function updatePurchaseOrder(id: string, input: PurchaseOrderInput): Promise<PurchaseResult> {
  const user = await staffCan("purchasing", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = poSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ref = adminDb().collection("purchaseOrders").doc(id);
  try {
    await adminDb().runTransaction(async (tx) => {
      const po = await tx.get(ref);
      if (!po.exists) throw new Error("Encomenda não encontrada.");
      if (po.get("status") !== "rascunho") throw new Error("Só se altera uma encomenda em rascunho.");
      const { fields } = await buildOrder(tx, parsed.data);
      tx.update(ref, { ...fields, updatedAt: Timestamp.now(), updatedBy: user.uid });
    });
  } catch (error) {
    return fail(error, "Não foi possível guardar.");
  }
  revalidatePath("/admin/compras", "layout");
  return { ok: true, id };
}

/**
 * Aprovar e enviar ao fornecedor (Gestor · ação especial das Compras). O prazo de pagamento conta a partir daqui.
 * shortcut: o envio ao fornecedor é feito pela equipa (WhatsApp, email); o PDF da encomenda fica para depois.
 */
export async function approvePurchaseOrder(id: string): Promise<PurchaseResult> {
  const user = await staffCan("purchasing", "approve");
  if (!user || user.role === "financeiro") return { ok: false, message: "Só o Gestor aprova encomendas de compra." };
  const db = adminDb();
  const ref = db.collection("purchaseOrders").doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const po = await tx.get(ref);
      if (!po.exists) throw new Error("Encomenda não encontrada.");
      if (po.get("status") !== "rascunho") throw new Error("Esta encomenda já foi aprovada.");
      const supplier = await tx.get(db.collection("suppliers").doc(po.get("supplierId")));
      const now = new Date();
      const dueAt = new Date(now.getTime() + ((supplier.get("paymentTermsDays") as number) ?? 0) * 86_400_000);
      const at = Timestamp.fromDate(now);
      tx.update(ref, {
        status: "enviada",
        approvedBy: user.uid,
        approvedAt: at,
        "payable.dueAt": Timestamp.fromDate(dueAt),
        updatedAt: at,
      });
      audit(
        tx,
        user,
        "purchase.approved",
        { type: "purchaseOrders", id, label: po.get("number") },
        { status: "enviada" },
      );
    });
  } catch (error) {
    return fail(error, "Não foi possível aprovar.");
  }
  revalidatePath("/admin/compras", "layout");
  return { ok: true };
}

/**
 * Receção (total ou parcial): cada linha recebida entra no stock ao custo da encomenda e atualiza o custo médio.
 * Pode receber quem edita as Compras ou quem regista no Stock (o Operador, docs/03 · "V (receção)").
 */
export async function receivePurchaseOrder(
  id: string,
  received: { materialId: string; qty: number }[],
): Promise<PurchaseResult> {
  const user = (await staffCan("purchasing", "edit")) ?? (await staffCan("stock", "create"));
  if (!user) return NO_PERMISSION;
  const parsed = z
    .array(z.object({ materialId: z.string().min(1), qty: z.number().finite().min(0).transform(roundQty) }))
    .safeParse(received);
  if (!parsed.success) return { ok: false, message: "Quantidades inválidas." };
  const incoming = parsed.data.filter((r) => r.qty > 0);
  if (!incoming.length) return { ok: false, message: "Indica o que chegou." };
  const db = adminDb();
  const ref = db.collection("purchaseOrders").doc(id);
  const lows: (LowStock | null)[] = [];
  try {
    await db.runTransaction(async (tx) => {
      lows.length = 0;
      const po = await tx.get(ref);
      if (!po.exists) throw new Error("Encomenda não encontrada.");
      if (!["enviada", "parcial"].includes(po.get("status")))
        throw new Error("Esta encomenda não está à espera de receção.");
      const lines = po.get("lines") as PurchaseLine[];
      const materials = await Promise.all(incoming.map((r) => tx.get(db.collection("materials").doc(r.materialId))));
      const updated = lines.map((line) => {
        const got = incoming.find((r) => r.materialId === line.materialId)?.qty ?? 0;
        if (roundQty(line.receivedQty + got) > line.qty)
          throw new Error(`Em ${line.description} só faltam ${roundQty(line.qty - line.receivedQty)}.`);
        return { ...line, receivedQty: roundQty(line.receivedQty + got) };
      });
      incoming.forEach((r, i) => {
        const material = materials[i];
        if (!material.exists) throw new Error("Um dos materiais já não existe.");
        const line = lines.find((l) => l.materialId === r.materialId);
        if (!line) throw new Error("Esse material não está nesta encomenda.");
        lows.push(
          moveStock(tx, material, user, {
            type: "entrada",
            delta: r.qty,
            unitCost: line.unitCost,
            reason: "Receção", // o número da encomenda aparece como link ao lado
            purchaseOrderId: id,
            purchaseOrderNumber: po.get("number"),
          }),
        );
      });
      const status = receivedStatus(updated);
      const at = Timestamp.now();
      tx.update(ref, { lines: updated, status, ...(status === "recebida" ? { receivedAt: at } : {}), updatedAt: at });
      audit(
        tx,
        user,
        "purchase.received",
        { type: "purchaseOrders", id, label: po.get("number") },
        {
          status,
          lines: incoming.length,
        },
      );
    });
  } catch (error) {
    return fail(error, "Não foi possível registar a receção.");
  }
  await warnLowStock(lows);
  revalidatePath("/admin/compras", "layout");
  revalidatePath("/admin/stock", "layout");
  return { ok: true };
}

/** Pagamento ao fornecedor (Financeiro · ação especial das Compras). As contas a pagar completas chegam na 6.4. */
export async function payPurchaseOrder(id: string, amount: number, reference: string): Promise<PurchaseResult> {
  const user = await staffCan("purchasing", "approve");
  if (!user || !["admin", "financeiro"].includes(user.role))
    return { ok: false, message: "Só o Financeiro regista pagamentos a fornecedores." };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, message: "Indica o valor." };
  const ref = adminDb().collection("purchaseOrders").doc(id);
  try {
    await adminDb().runTransaction(async (tx) => {
      const po = await tx.get(ref);
      if (!po.exists) throw new Error("Encomenda não encontrada.");
      if (["rascunho", "cancelada"].includes(po.get("status"))) throw new Error("Esta encomenda não está para pagar.");
      const total = po.get("totals.total") as number;
      const paidBefore = (po.get("payable.paid") as number) ?? 0;
      if (paidBefore + amount > total) throw new Error(`Falta pagar só ${formatKz(total - paidBefore)}.`);
      const paid = paidBefore + amount;
      const at = Timestamp.now();
      tx.update(ref, {
        "payable.paid": paid,
        "payable.status": payableStatus(paid, total),
        payments: [
          ...((po.get("payments") ?? []) as object[]),
          { amount, reference: reference.trim().slice(0, 80) || null, by: user.uid, at },
        ],
        updatedAt: at,
      });
      audit(tx, user, "purchase.paid", { type: "purchaseOrders", id, label: po.get("number") }, { amount, paid });
    });
  } catch (error) {
    return fail(error, "Não foi possível registar o pagamento.");
  }
  revalidatePath("/admin/compras", "layout");
  return { ok: true };
}

export async function cancelPurchaseOrder(id: string, reason: string): Promise<PurchaseResult> {
  const user = await staffCan("purchasing", "edit");
  if (!user) return NO_PERMISSION;
  if (reason.trim().length < 3) return { ok: false, message: "Indica o motivo." };
  const ref = adminDb().collection("purchaseOrders").doc(id);
  try {
    await adminDb().runTransaction(async (tx) => {
      const po = await tx.get(ref);
      if (!po.exists) throw new Error("Encomenda não encontrada.");
      if (!["rascunho", "enviada"].includes(po.get("status")))
        throw new Error("Já há material recebido: não se cancela.");
      if (((po.get("payable.paid") as number) ?? 0) > 0)
        throw new Error("Já há pagamentos registados: não se cancela.");
      const at = Timestamp.now();
      tx.update(ref, { status: "cancelada", cancel: { reason: reason.trim(), by: user.uid, at }, updatedAt: at });
      audit(
        tx,
        user,
        "purchase.cancelled",
        { type: "purchaseOrders", id, label: po.get("number") },
        { reason: reason.trim() },
      );
    });
  } catch (error) {
    return fail(error, "Não foi possível cancelar.");
  }
  revalidatePath("/admin/compras", "layout");
  return { ok: true };
}
