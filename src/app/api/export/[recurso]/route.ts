import { ACTION_LABELS } from "@/features/admin/audit-labels";
import { listCustomers } from "@/features/admin/customers";
import { listExpenses, listPayments } from "@/features/admin/finance";
import { listMaterials } from "@/features/admin/materials";
import { staffCan } from "@/features/admin/guard";
import { listOrders } from "@/features/admin/orders";
import { tablePdf } from "@/features/admin/table-pdf";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { ORDER_STATUS_META, ORDER_STATUSES, PAYMENT_STATUS_META, type OrderStatus } from "@/lib/domain/order-status";
import { formatPhone } from "@/lib/domain/phone";
import { EXPENSE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/domain/finance";
import { CATEGORY_LABELS, formatQty } from "@/lib/domain/stock";
import { toCsv, toXls, type Column } from "@/lib/export";
import { adminDb } from "@/lib/firebase/admin";

type Table = {
  title: string;
  columns: Column<Record<string, string | number>>[];
  rows: Record<string, string | number>[];
  widths: number[];
};

async function ordersTable(params: URLSearchParams): Promise<Table> {
  const estado = params.get("estado") ?? "ativos";
  const status = (ORDER_STATUSES as readonly string[]).includes(estado)
    ? (estado as OrderStatus)
    : estado === "todos"
      ? undefined
      : "ativos";
  const rows = await listOrders({ status, q: params.get("q") || undefined, limit: 2000 });
  return {
    title: "Pedidos",
    widths: [12, 18, 12, 12, 10, 10, 10, 10],
    columns: [
      { label: "Pedido", value: (r) => r.number },
      { label: "Cliente", value: (r) => r.customer },
      { label: "Telefone", value: (r) => r.phone },
      { label: "Estado", value: (r) => r.status },
      { label: "Pagamento", value: (r) => r.payment },
      { label: "Data", value: (r) => r.created },
      { label: "Prazo", value: (r) => r.due },
      { label: "Total (Kz)", value: (r) => r.total },
    ],
    rows: rows.map((r) => ({
      number: r.number,
      customer: r.customerName,
      phone: formatPhone(r.customerPhone),
      status: ORDER_STATUS_META[r.status].label,
      payment: PAYMENT_STATUS_META[r.paymentStatus].label,
      created: formatDate(r.createdAt),
      due: formatDate(r.dueAt),
      total: r.total / 100,
    })),
  };
}

async function customersTable(params: URLSearchParams): Promise<Table> {
  const rows = await listCustomers({
    q: params.get("q") || undefined,
    segment: params.get("segmento") || undefined,
    limit: 5000,
  });
  return {
    title: "Clientes",
    widths: [20, 10, 12, 18, 10, 10, 10],
    columns: [
      { label: "Nome", value: (r) => r.name },
      { label: "Tipo", value: (r) => r.type },
      { label: "Telefone", value: (r) => r.phone },
      { label: "Email", value: (r) => r.email },
      { label: "NIF", value: (r) => r.nif },
      { label: "Segmento", value: (r) => r.segment },
      { label: "Etiquetas", value: (r) => r.tags },
    ],
    rows: rows.map((c) => ({
      name: c.name,
      type: c.type,
      phone: formatPhone(c.phone),
      email: c.email ?? "",
      nif: c.nif ?? "",
      segment: c.segment,
      tags: c.tags.join(", "),
    })),
  };
}

async function stockTable(): Promise<Table> {
  const rows = (await listMaterials()).filter((m) => m.active);
  return {
    title: "Stock",
    widths: [12, 24, 12, 12, 12, 10, 12],
    columns: [
      { label: "SKU", value: (r) => r.sku },
      { label: "Material", value: (r) => r.name },
      { label: "Categoria", value: (r) => r.category },
      { label: "Em stock", value: (r) => r.qty },
      { label: "Mínimo", value: (r) => r.min },
      { label: "Custo médio (Kz)", value: (r) => r.cost },
      { label: "Local", value: (r) => r.location },
    ],
    // Quantidades como texto com unidade: o PDF formata números como Kz
    rows: rows.map((m) => ({
      sku: m.sku,
      name: m.name,
      category: CATEGORY_LABELS[m.category],
      qty: formatQty(m.qty, m.unit),
      min: formatQty(m.minQty, m.unit),
      cost: Math.round(m.avgCost) / 100,
      location: m.location ?? "",
    })),
  };
}

async function paymentsTable(): Promise<Table> {
  const rows = await listPayments();
  return {
    title: "Pagamentos",
    widths: [12, 14, 10, 14, 14, 12, 10],
    columns: [
      { label: "Data", value: (r) => r.day },
      { label: "Pedido", value: (r) => r.order },
      { label: "Tipo", value: (r) => r.kind },
      { label: "Meio", value: (r) => r.method },
      { label: "Referência", value: (r) => r.reference },
      { label: "Conciliado", value: (r) => r.reconciled },
      { label: "Valor (Kz)", value: (r) => r.amount },
    ],
    rows: rows
      .filter((p) => p.status === "confirmado")
      .map((p) => ({
        day: p.at ? formatDate(p.at) : "",
        order: p.orderNumber,
        kind: p.kind,
        method: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        reference: p.reference,
        reconciled: p.reconciled ? "sim" : "não",
        amount: p.amount / 100,
      })),
  };
}

async function expensesTable(): Promise<Table> {
  const rows = await listExpenses();
  return {
    title: "Despesas",
    widths: [11, 16, 22, 14, 9, 11, 11],
    columns: [
      { label: "Data", value: (r) => r.day },
      { label: "Categoria", value: (r) => r.category },
      { label: "Descrição", value: (r) => r.description },
      { label: "Fornecedor", value: (r) => r.supplier },
      { label: "Estado", value: (r) => r.status },
      { label: "IVA (Kz)", value: (r) => r.tax },
      { label: "Valor (Kz)", value: (r) => r.amount },
    ],
    rows: rows.map((e) => ({
      day: e.day.split("-").reverse().join("/"),
      category: EXPENSE_LABELS[e.category],
      description: e.description,
      supplier: e.supplierName,
      status: e.status,
      tax: e.taxAmount / 100,
      amount: e.amount / 100,
    })),
  };
}

async function auditTable(): Promise<Table> {
  const snap = await adminDb().collection("auditLogs").orderBy("at", "desc").limit(2000).get();
  return {
    title: "Auditoria",
    widths: [14, 16, 12, 26, 18],
    columns: [
      { label: "Quando", value: (r) => r.at },
      { label: "Quem", value: (r) => r.actor },
      { label: "Papel", value: (r) => r.role },
      { label: "Ação", value: (r) => r.action },
      { label: "Registo", value: (r) => r.label },
    ],
    rows: snap.docs.map((d) => ({
      at: formatDateTime(d.get("at").toDate()),
      actor: d.get("actorName") ?? "",
      role: d.get("actorRole") ?? "",
      action: ACTION_LABELS[d.get("action")] ?? d.get("action"),
      label: d.get("entity.label") ?? "",
    })),
  };
}

const RESOURCES = {
  auditoria: { module: "audit" as const, build: auditTable },
  pagamentos: { module: "finance" as const, build: paymentsTable },
  despesas: { module: "finance" as const, build: expensesTable },
  pedidos: { module: "orders" as const, build: ordersTable },
  clientes: { module: "customers" as const, build: customersTable },
  stock: { module: "stock" as const, build: stockTable },
};

/** Exportação das listas do painel em CSV, Excel ou PDF, com os mesmos filtros da página. */
export async function GET(request: Request, { params }: RouteContext<"/api/export/[recurso]">) {
  const resource = RESOURCES[(await params).recurso as keyof typeof RESOURCES];
  if (!resource) return new Response("Recurso desconhecido.", { status: 404 });
  const user = await staffCan(resource.module, "export");
  if (!user) return new Response("Sem permissão.", { status: 403 });

  const search = new URL(request.url).searchParams;
  const table = await resource.build(search);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${table.title.toLowerCase()}-${stamp}`;
  const format = search.get("formato");
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${name}.${ext}"`,
    "Cache-Control": "private, no-store",
  });

  if (format === "xls")
    return new Response(toXls(table.rows, table.columns, table.title), {
      headers: headers("application/vnd.ms-excel; charset=utf-8", "xls"),
    });
  if (format === "pdf") {
    const bytes = await tablePdf(
      table.title,
      table.columns.map((c) => c.label),
      table.rows.map((r) =>
        table.columns.map((c) =>
          typeof c.value(r) === "number" ? formatKz(Number(c.value(r)) * 100) : String(c.value(r)),
        ),
      ),
      table.widths,
    );
    return new Response(bytes as BodyInit, { headers: headers("application/pdf", "pdf") });
  }
  return new Response(toCsv(table.rows, table.columns), { headers: headers("text/csv; charset=utf-8", "csv") });
}
