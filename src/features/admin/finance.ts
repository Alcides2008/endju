import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { dayKey, type ExpenseCategory, type InvoiceType } from "@/lib/domain/finance";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Leituras do Financeiro (docs/02 · Finanças). Consultas de um só campo, ordenadas aqui (sem índices compostos).
 * shortcut: as listas trazem os últimos 300 registos; com mais volume, paginar por data.
 */
const toDate = (t: unknown) => (t as Timestamp | undefined)?.toDate() ?? null;
const LIMIT = 300;

export type PaymentRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: string;
  method: string;
  amount: number;
  status: string;
  reference: string;
  at: Date | null;
  reconciled: boolean;
  proof: { publicId: string; format: string } | null;
};

export async function listPayments(): Promise<PaymentRow[]> {
  const snap = await adminDb().collection("payments").orderBy("createdAt", "desc").limit(LIMIT).get();
  return snap.docs.map((d) => ({
    id: d.id,
    orderId: d.get("orderId"),
    orderNumber: d.get("orderNumber") ?? "",
    kind: d.get("kind") ?? "",
    method: d.get("method") ?? "",
    amount: d.get("amount") ?? 0,
    status: d.get("status") ?? "",
    reference: d.get("provider.reference") ?? "",
    at: toDate(d.get("confirmedAt") ?? d.get("createdAt")),
    reconciled: Boolean(d.get("reconciliation")),
    proof: d.get("transferProof") ?? null,
  }));
}

export type Receivable = {
  id: string;
  number: string;
  customerName: string;
  status: string;
  total: number;
  paid: number;
  due: number;
  depositMissing: number;
  dueAt: Date | null;
};

/** Pedidos com dinheiro por receber (os cancelados não contam). */
export async function listReceivables(): Promise<Receivable[]> {
  const snap = await adminDb().collection("orders").where("totals.due", ">", 0).limit(LIMIT).get();
  return snap.docs
    .filter((d) => d.get("status") !== "cancelado")
    .map((d) => {
      const totals = d.get("totals") ?? {};
      return {
        id: d.id,
        number: d.get("number"),
        customerName: d.get("customer.name") ?? "",
        status: d.get("status"),
        total: totals.total ?? 0,
        paid: totals.paid ?? 0,
        due: totals.due ?? 0,
        depositMissing: Math.max(0, (totals.depositRequired ?? 0) - (totals.paid ?? 0)),
        dueAt: toDate(d.get("dueAt")),
      };
    })
    .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
}

export type Payable = {
  id: string;
  kind: "compra" | "despesa";
  label: string;
  party: string;
  total: number;
  paid: number;
  due: number;
  dueAt: Date | null;
  href: string;
};

/** Contas a pagar: encomendas de compra aprovadas por pagar e despesas pendentes. */
export async function listPayables(): Promise<Payable[]> {
  const db = adminDb();
  const [orders, expenses] = await Promise.all([
    db.collection("purchaseOrders").where("payable.status", "in", ["por_pagar", "parcial"]).limit(LIMIT).get(),
    db.collection("expenses").where("status", "==", "pendente").limit(LIMIT).get(),
  ]);
  const rows: Payable[] = [
    ...orders.docs
      .filter((d) => !["rascunho", "cancelada"].includes(d.get("status")))
      .map((d) => {
        const total = d.get("totals.total") ?? 0;
        const paid = d.get("payable.paid") ?? 0;
        return {
          id: d.id,
          kind: "compra" as const,
          label: d.get("number"),
          party: d.get("supplierName") ?? "",
          total,
          paid,
          due: total - paid,
          dueAt: toDate(d.get("payable.dueAt")),
          href: `/admin/compras/encomendas/${d.id}`,
        };
      }),
    ...expenses.docs.map((d) => ({
      id: d.id,
      kind: "despesa" as const,
      label: d.get("description"),
      party: d.get("supplierName") ?? "",
      total: d.get("amount") ?? 0,
      paid: 0,
      due: d.get("amount") ?? 0,
      dueAt: toDate(d.get("dueAt") ?? d.get("date")),
      href: "/admin/financeiro/despesas",
    })),
  ];
  return rows.sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity));
}

export type ExpenseRow = {
  id: string;
  category: ExpenseCategory;
  description: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  taxAmount: number;
  day: string;
  dueDay: string;
  status: "pendente" | "pago";
  paidAt: Date | null;
  paymentMethod: string;
  recurring: boolean;
};

export async function listExpenses(): Promise<ExpenseRow[]> {
  const snap = await adminDb().collection("expenses").orderBy("date", "desc").limit(LIMIT).get();
  return snap.docs.map((d) => ({
    id: d.id,
    category: d.get("category"),
    description: d.get("description"),
    supplierId: d.get("supplierId") ?? "",
    supplierName: d.get("supplierName") ?? "",
    amount: d.get("amount") ?? 0,
    taxAmount: d.get("taxAmount") ?? 0,
    day: dayKey(toDate(d.get("date"))!),
    dueDay: d.get("dueAt") ? dayKey(toDate(d.get("dueAt"))!) : "",
    status: d.get("status"),
    paidAt: toDate(d.get("paidAt")),
    paymentMethod: d.get("paymentMethod") ?? "",
    recurring: Boolean(d.get("recurring")),
  }));
}

export type InvoiceRow = {
  id: string;
  docType: InvoiceType;
  number: string;
  status: "emitida" | "anulada";
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerNif: string;
  total: number;
  tax: number;
  day: string;
  pdfUrl: string;
  voidReason: string;
};

export async function listInvoices(): Promise<InvoiceRow[]> {
  const snap = await adminDb().collection("invoices").orderBy("issuedAt", "desc").limit(LIMIT).get();
  return snap.docs
    .filter((d) => d.get("docType") !== "proforma")
    .map((d) => ({
      id: d.id,
      docType: d.get("docType"),
      number: d.get("number"),
      status: d.get("status"),
      orderId: d.get("orderId") ?? "",
      orderNumber: d.get("orderNumber") ?? "",
      customerName: d.get("customer.name") ?? "",
      customerNif: d.get("customer.nif") ?? "",
      total: d.get("totals.total") ?? 0,
      tax: d.get("totals.tax") ?? 0,
      day: dayKey(toDate(d.get("issuedAt"))!),
      pdfUrl: d.get("pdfUrl") ?? "",
      voidReason: d.get("voidReason") ?? "",
    }));
}

/** O que entra nas contas do IVA de um mês: faturas, despesas e compras aprovadas nesse mês. */
export async function vatInputs(from: Date, to: Date) {
  const db = adminDb();
  const range = <T extends FirebaseFirestore.Query>(q: T, field: string) =>
    q.where(field, ">=", from).where(field, "<", to).get();
  const [invoices, expenses, purchases] = await Promise.all([
    range(db.collection("invoices"), "issuedAt"),
    range(db.collection("expenses"), "date"),
    range(db.collection("purchaseOrders"), "approvedAt"),
  ]);
  return {
    invoices: invoices.docs
      .filter((d) => d.get("docType") !== "proforma")
      .map((d) => ({
        day: dayKey(toDate(d.get("issuedAt"))!),
        type: d.get("docType") as InvoiceType,
        tax: d.get("totals.tax") ?? 0,
        total: d.get("totals.total") ?? 0,
        status: d.get("status") as "emitida" | "anulada",
      })),
    expenses: expenses.docs.map((d) => ({ day: dayKey(toDate(d.get("date"))!), tax: d.get("taxAmount") ?? 0 })),
    purchases: purchases.docs
      .filter((d) => d.get("status") !== "cancelada")
      .map((d) => ({ day: dayKey(toDate(d.get("approvedAt"))!), tax: d.get("totals.tax") ?? 0 })),
  };
}

export type ImportRow = {
  id: string;
  source: string;
  at: Date | null;
  linesCount: number;
  matchedCount: number;
  fileName: string;
};

export async function listStatementImports(): Promise<ImportRow[]> {
  const snap = await adminDb().collection("statementImports").orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => ({
    id: d.id,
    source: d.get("source"),
    at: toDate(d.get("createdAt")),
    linesCount: d.get("linesCount") ?? 0,
    matchedCount: d.get("matchedCount") ?? 0,
    fileName: d.get("fileName") ?? "",
  }));
}

export type StatementLineRow = {
  id: string;
  day: string;
  description: string;
  amount: number;
  reference: string;
  status: "por_conciliar" | "conciliada" | "ignorada";
  paymentId: string;
  orderNumber: string;
};

export async function getStatementImport(id: string) {
  const ref = adminDb().collection("statementImports").doc(id);
  const [snap, lines] = await Promise.all([ref.get(), ref.collection("lines").get()]);
  if (!snap.exists) return null;
  return {
    id,
    source: snap.get("source") as string,
    fileName: (snap.get("fileName") as string) ?? "",
    at: toDate(snap.get("createdAt")),
    lines: lines.docs
      .map((d): StatementLineRow => ({
        id: d.id,
        day: d.get("day"),
        description: d.get("description") ?? "",
        amount: d.get("amount"),
        reference: d.get("reference") ?? "",
        status: d.get("status"),
        paymentId: d.get("paymentId") ?? "",
        orderNumber: d.get("orderNumber") ?? "",
      }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };
}
