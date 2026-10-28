/** Relatórios (docs/03 · 16): contas puras sobre pedidos, itens e tarefas de um período. */

export type ReportOrder = {
  id: string;
  status: string;
  total: number;
  customerKey: string;
  customerName: string;
  month: string; // "2026-10"
  late: boolean;
};

export type ReportItem = { orderId: string; name: string; quantity: number; total: number };

/** Os n maiores por valor, a partir de pares chave → { label, value, count }. */
function top<T extends { value: number }>(map: Map<string, T>, n: number) {
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, n);
}

export function summarizeOrders(orders: ReportOrder[], items: ReportItem[]) {
  const valid = orders.filter((o) => o.status !== "cancelado");
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const byMonth = new Map<string, { label: string; value: number; count: number }>();
  const byCustomer = new Map<string, { label: string; value: number; count: number }>();
  for (const o of valid) {
    const m = byMonth.get(o.month) ?? { label: o.month, value: 0, count: 0 };
    m.value += o.total;
    m.count++;
    byMonth.set(o.month, m);
    const c = byCustomer.get(o.customerKey) ?? { label: o.customerName, value: 0, count: 0 };
    c.value += o.total;
    c.count++;
    byCustomer.set(o.customerKey, c);
  }
  const ids = new Set(valid.map((o) => o.id));
  const byProduct = new Map<string, { label: string; value: number; count: number }>();
  for (const it of items) {
    if (!ids.has(it.orderId)) continue;
    const p = byProduct.get(it.name) ?? { label: it.name, value: 0, count: 0 };
    p.value += it.total;
    p.count += it.quantity;
    byProduct.set(it.name, p);
  }
  return {
    orders: valid.length,
    cancelled: orders.length - valid.length,
    revenue,
    average: valid.length ? Math.round(revenue / valid.length) : 0,
    late: valid.filter((o) => o.late).length,
    months: [...byMonth.values()].sort((a, b) => a.label.localeCompare(b.label)),
    customers: top(byCustomer, 10),
    products: top(byProduct, 10),
  };
}
