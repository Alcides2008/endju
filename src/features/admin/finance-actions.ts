"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import {
  EXPENSE_CATEGORIES,
  INVOICE_TYPES,
  dayKey,
  matchPayment,
  nextMonth,
  parseStatementCsv,
  type MatchCandidate,
} from "@/lib/domain/finance";
import { adminDb } from "@/lib/firebase/admin";
import { confirmPayment } from "@/features/payments/server";
import { NO_PERMISSION, staffCan } from "./guard";
import { notifyUser } from "./notify";

export type FinanceResult =
  { ok: true; id?: string; matched?: number; lines?: number } | { ok: false; message: string };

const cents = z.number().int().min(0).max(100_000_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica a data.");
const optionalDay = z.union([z.literal(""), day]);
// Meio-dia de Luanda: a data nunca muda de dia por causa do fuso
const atNoon = (d: string) => Timestamp.fromDate(new Date(`${d}T12:00:00+01:00`));

const actorName = (user: SessionUser) => user.name ?? user.email ?? "Equipa";

function audit(
  tx: FirebaseFirestore.Transaction,
  user: SessionUser,
  action: string,
  type: string,
  id: string,
  label: string,
) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action,
    entity: { type, id, label },
    at: Timestamp.now(),
  });
}

const refresh = () => revalidatePath("/admin/financeiro", "layout");

const fail = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof Error ? error.message : fallback,
});

// ── Despesas ──

const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(3, "Descreve a despesa.").max(160),
  supplierId: z.string().max(60),
  amount: cents.min(1, "Indica o valor."),
  taxAmount: cents,
  day,
  dueDay: optionalDay,
  recurring: z.boolean(),
});

export type ExpenseInput = z.input<typeof expenseSchema>;

/** Despesa nova (id vazio) ou alteração de uma pendente. O valor é com IVA; o IVA à parte é o dedutível. */
export async function saveExpense(id: string | null, input: ExpenseInput): Promise<FinanceResult> {
  const user = await staffCan("finance", id ? "edit" : "create");
  if (!user) return NO_PERMISSION;
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;
  if (data.taxAmount > data.amount) return { ok: false, message: "O IVA não pode ser maior que o valor." };
  const db = adminDb();
  const ref = id ? db.collection("expenses").doc(id) : db.collection("expenses").doc();
  try {
    await db.runTransaction(async (tx) => {
      const [current, supplier] = await Promise.all([
        id ? tx.get(ref) : Promise.resolve(null),
        data.supplierId ? tx.get(db.collection("suppliers").doc(data.supplierId)) : Promise.resolve(null),
      ]);
      if (current && !current.exists) throw new Error("Esta despesa já não existe.");
      if (current?.get("status") === "pago") throw new Error("Uma despesa paga já não se altera.");
      const at = Timestamp.now();
      tx.set(
        ref,
        {
          category: data.category,
          description: data.description,
          supplierId: data.supplierId || null,
          supplierName: supplier?.exists ? supplier.get("name") : null,
          amount: data.amount,
          taxAmount: data.taxAmount,
          date: atNoon(data.day),
          dueAt: data.dueDay ? atNoon(data.dueDay) : null,
          recurring: data.recurring ? { every: "mes" } : null,
          ...(id ? {} : { status: "pendente", createdAt: at, createdBy: user.uid }),
          updatedAt: at,
        },
        { merge: true },
      );
      audit(tx, user, id ? "expense.updated" : "expense.created", "expenses", ref.id, data.description);
    });
    refresh();
    return { ok: true, id: ref.id };
  } catch (error) {
    return fail(error, "Não foi possível guardar a despesa.");
  }
}

/** Marca a despesa como paga; as mensais criam logo a do mês seguinte, por pagar. */
export async function payExpense(id: string, input: { method: string; day: string }): Promise<FinanceResult> {
  const user = await staffCan("finance", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = z.object({ method: z.string().min(1).max(40), day }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Indica a data e o meio de pagamento." };
  const db = adminDb();
  const ref = db.collection("expenses").doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Esta despesa já não existe.");
      if (snap.get("status") === "pago") throw new Error("Esta despesa já está paga.");
      tx.update(ref, {
        status: "pago",
        paidAt: atNoon(parsed.data.day),
        paymentMethod: parsed.data.method,
        paidBy: user.uid,
      });
      if (snap.get("recurring")) {
        const dueDay = snap.get("dueAt") ? nextMonth(dayKey(snap.get("dueAt").toDate())) : "";
        tx.set(db.collection("expenses").doc(), {
          ...snap.data(),
          date: atNoon(nextMonth(dayKey(snap.get("date").toDate()))),
          dueAt: dueDay ? atNoon(dueDay) : null,
          status: "pendente",
          paidAt: null,
          paymentMethod: null,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
          previousId: id,
        });
      }
      audit(tx, user, "expense.paid", "expenses", id, snap.get("description"));
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível registar o pagamento.");
  }
}

// ── Faturas (cópia do documento emitido no software certificado) ──

const invoiceSchema = z.object({
  docType: z.enum(INVOICE_TYPES),
  number: z.string().trim().min(3, "Indica o número do documento, tal como saiu do programa de faturação.").max(60),
  orderNumber: z.string().trim().max(30),
  customerName: z.string().trim().max(120),
  customerNif: z.string().trim().max(20),
  total: cents.min(1, "Indica o total."),
  tax: cents,
  day,
});

export type InvoiceInput = z.input<typeof invoiceSchema>;

/**
 * Regista um documento fiscal já emitido no programa certificado (o painel não emite faturas: AGT).
 * Com o número do pedido, liga-o ao pedido e copia o cliente. shortcut: o PDF fica no programa de faturação;
 * guardar a cópia aqui espera pelo Storage privado (não vai para o Cloudinary, que é público).
 */
export async function registerInvoice(input: InvoiceInput): Promise<FinanceResult> {
  const user = await staffCan("finance", "create");
  if (!user) return NO_PERMISSION;
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;
  if (data.tax > data.total) return { ok: false, message: "O IVA não pode ser maior que o total." };
  const db = adminDb();
  try {
    const dup = await db.collection("invoices").where("number", "==", data.number).limit(5).get();
    if (dup.docs.some((d) => d.get("docType") === data.docType))
      return { ok: false, message: `O documento ${data.number} já está registado.` };
    const order = data.orderNumber
      ? (await db.collection("orders").where("number", "==", data.orderNumber.toUpperCase()).limit(1).get()).docs[0]
      : undefined;
    if (data.orderNumber && !order) return { ok: false, message: `Não encontrei o pedido ${data.orderNumber}.` };
    const ref = db.collection("invoices").doc();
    await db.runTransaction(async (tx) => {
      const at = Timestamp.now();
      tx.set(ref, {
        docType: data.docType,
        number: data.number,
        status: "emitida",
        orderId: order?.id ?? null,
        orderNumber: order?.get("number") ?? null,
        customerId: order?.get("customerId") ?? null,
        customer: {
          name: data.customerName || order?.get("customer.name") || "Consumidor final",
          nif: data.customerNif || order?.get("customer.nif") || null,
        },
        totals: { subtotal: data.total - data.tax, tax: data.tax, total: data.total, discount: 0 },
        issuedAt: atNoon(data.day),
        createdAt: at,
        createdBy: user.uid,
      });
      audit(tx, user, "invoice.registered", "invoices", ref.id, data.number);
    });
    refresh();
    return { ok: true, id: ref.id };
  } catch (error) {
    return fail(error, "Não foi possível registar o documento.");
  }
}

/** Anular no painel o que foi anulado no programa de faturação (fica o registo, sai das contas do IVA). */
export async function voidInvoice(id: string, reason: string): Promise<FinanceResult> {
  const user = await staffCan("finance", "approve");
  if (!user) return NO_PERMISSION;
  if (reason.trim().length < 3) return { ok: false, message: "Indica o motivo da anulação." };
  const db = adminDb();
  const ref = db.collection("invoices").doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.get("status") === "anulada") throw new Error("Documento já anulado ou inexistente.");
      tx.update(ref, {
        status: "anulada",
        voidReason: reason.trim().slice(0, 200),
        voidedAt: Timestamp.now(),
        voidedBy: user.uid,
      });
      audit(tx, user, "invoice.voided", "invoices", id, snap.get("number"));
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível anular o documento.");
  }
}

// ── Conciliação de extratos ──

async function openCandidates(fromDay: string, toDay: string): Promise<MatchCandidate[]> {
  const from = new Date(Date.parse(fromDay) - 6 * 86_400_000);
  const to = new Date(Date.parse(toDay) + 6 * 86_400_000);
  const snap = await adminDb()
    .collection("payments")
    .where("confirmedAt", ">=", from)
    .where("confirmedAt", "<", to)
    .get();
  return snap.docs
    .filter((d) => d.get("status") === "confirmado" && !d.get("reconciliation") && d.get("method") !== "numerario")
    .map((d) => ({
      id: d.id,
      day: dayKey(d.get("confirmedAt").toDate()),
      amount: d.get("amount"),
      orderNumber: d.get("orderNumber") ?? "",
      reference: d.get("provider.reference") ?? "",
    }));
}

/**
 * Importa o CSV do extrato (o browser lê o ficheiro e envia o texto) e concilia sozinho o que é inequívoco:
 * mesmo valor, até 5 dias, e o número do pedido ou a referência no descritivo quando há dúvidas.
 * shortcut: guarda as linhas, não o ficheiro (o Storage privado ainda não está ativo).
 */
export async function importStatement(input: {
  source: string;
  fileName: string;
  csv: string;
}): Promise<FinanceResult> {
  const user = await staffCan("finance", "approve");
  if (!user) return NO_PERMISSION;
  const parsed = z
    .object({
      source: z.enum(["banco", "multicaixa"]),
      fileName: z.string().max(120),
      csv: z.string().min(10).max(2_000_000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Escolhe o ficheiro CSV do extrato." };
  const { lines, error } = parseStatementCsv(parsed.data.csv);
  if (error) return { ok: false, message: error };
  if (lines.length > 450) return { ok: false, message: "Extrato com mais de 450 entradas: divide-o por quinzena." };
  const days = lines.map((l) => l.day).sort();
  const db = adminDb();
  try {
    const candidates = await openCandidates(days[0], days[days.length - 1]);
    const used = new Set<string>();
    const ref = db.collection("statementImports").doc();
    const batch = db.batch();
    let matched = 0;
    for (const line of lines) {
      const match = matchPayment(
        line,
        candidates.filter((c) => !used.has(c.id)),
      );
      const lineRef = ref.collection("lines").doc();
      if (match) {
        used.add(match.id);
        matched++;
        batch.update(db.collection("payments").doc(match.id), {
          reconciliation: { importId: ref.id, lineId: lineRef.id, matchedAt: Timestamp.now(), matchedBy: "automático" },
        });
      }
      batch.set(lineRef, {
        ...line,
        status: match ? "conciliada" : "por_conciliar",
        paymentId: match?.id ?? null,
        orderNumber: match?.orderNumber ?? null,
      });
    }
    batch.set(ref, {
      source: parsed.data.source,
      fileName: parsed.data.fileName,
      periodFrom: days[0],
      periodTo: days[days.length - 1],
      linesCount: lines.length,
      matchedCount: matched,
      createdAt: Timestamp.now(),
      createdBy: user.uid,
    });
    batch.set(db.collection("auditLogs").doc(), {
      actorId: user.uid,
      actorName: actorName(user),
      actorRole: user.role,
      action: "statement.imported",
      entity: { type: "statementImports", id: ref.id, label: `${lines.length} linha(s), ${matched} conciliada(s)` },
      at: Timestamp.now(),
    });
    await batch.commit();
    refresh();
    return { ok: true, id: ref.id, lines: lines.length, matched };
  } catch (error) {
    return fail(error, "Não foi possível importar o extrato.");
  }
}

/** Pagamentos ainda por conciliar perto da data da linha, com o mesmo valor primeiro (para a escolha à mão). */
export async function lineCandidates(importId: string, lineId: string) {
  if (!(await staffCan("finance", "approve"))) return [];
  const line = await adminDb().collection("statementImports").doc(importId).collection("lines").doc(lineId).get();
  if (!line.exists) return [];
  const all = await openCandidates(line.get("day"), line.get("day"));
  return all.sort((a, b) => Number(b.amount === line.get("amount")) - Number(a.amount === line.get("amount")));
}

/** Concilia, desfaz ou ignora uma linha do extrato. */
export async function setLine(
  importId: string,
  lineId: string,
  action: { kind: "match"; paymentId: string } | { kind: "unmatch" } | { kind: "ignore" },
): Promise<FinanceResult> {
  const user = await staffCan("finance", "approve");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const importRef = db.collection("statementImports").doc(importId);
  const lineRef = importRef.collection("lines").doc(lineId);
  try {
    await db.runTransaction(async (tx) => {
      const [line, imp, payment] = await Promise.all([
        tx.get(lineRef),
        tx.get(importRef),
        action.kind === "match" ? tx.get(db.collection("payments").doc(action.paymentId)) : Promise.resolve(null),
      ]);
      if (!line.exists || !imp.exists) throw new Error("Linha não encontrada.");
      const previous = line.get("paymentId") as string | null;
      const previousRef = previous ? db.collection("payments").doc(previous) : null;
      if (action.kind === "match") {
        if (!payment?.exists) throw new Error("Pagamento não encontrado.");
        if (payment.get("reconciliation")) throw new Error("Esse pagamento já está conciliado com outra linha.");
        if (previousRef) tx.update(previousRef, { reconciliation: null });
        tx.update(payment.ref, {
          reconciliation: { importId, lineId, matchedAt: Timestamp.now(), matchedBy: user.uid },
        });
        tx.update(lineRef, {
          status: "conciliada",
          paymentId: payment.id,
          orderNumber: payment.get("orderNumber") ?? null,
        });
      } else {
        if (previousRef) tx.update(previousRef, { reconciliation: null });
        tx.update(lineRef, {
          status: action.kind === "ignore" ? "ignorada" : "por_conciliar",
          paymentId: null,
          orderNumber: null,
        });
      }
      const delta = (action.kind === "match" ? 1 : 0) - (previous ? 1 : 0);
      if (delta) tx.update(importRef, { matchedCount: (imp.get("matchedCount") ?? 0) + delta });
      audit(tx, user, `statement.${action.kind}`, "statementImports", importId, line.get("description") || lineId);
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível atualizar a linha.");
  }
}

/**
 * Transferência com comprovativo: o Financeiro confirma quando o dinheiro entrou na conta (soma ao pedido,
 * como um pagamento automático) ou recusa com motivo (o cliente é avisado e pode enviar outro).
 */
export async function validateTransfer(paymentId: string, decision: { accept: boolean; reason?: string }) {
  const user = await staffCan("finance", "approve");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const ref = db.collection("payments").doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists || snap.get("status") !== "aguarda_validacao")
    return { ok: false as const, message: "Este comprovativo já foi tratado." };
  try {
    if (decision.accept) {
      await confirmPayment(paymentId, { uid: user.uid, name: actorName(user), via: "equipa" });
    } else {
      const reason = (decision.reason ?? "").trim();
      if (reason.length < 3) return { ok: false as const, message: "Indica o motivo, para o cliente perceber." };
      await ref.update({
        status: "pendente",
        transferProof: null,
        rejectedReason: reason,
        rejectedAt: Timestamp.now(),
        rejectedBy: user.uid,
      });
      const userId = snap.get("userId") as string | undefined;
      if (userId)
        await notifyUser(userId, {
          event: "pagamento.confirmado",
          title: `Comprovativo recusado · ${snap.get("orderNumber")}`,
          body: reason,
          link: `/conta/pedidos/${snap.get("orderNumber")}`,
        });
    }
    refresh();
    return { ok: true as const };
  } catch (error) {
    return fail(error, "Não foi possível tratar o comprovativo.");
  }
}
