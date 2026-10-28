import { describe, expect, it } from "vitest";
import { summarizeOrders } from "@/lib/domain/reports";

describe("summarizeOrders", () => {
  it("tira os cancelados das contas e ordena clientes e produtos pelo valor", () => {
    const r = summarizeOrders(
      [
        {
          id: "a",
          status: "entregue",
          total: 100,
          customerKey: "c1",
          customerName: "Ana",
          month: "2026-10",
          late: false,
        },
        {
          id: "b",
          status: "recebido",
          total: 300,
          customerKey: "c2",
          customerName: "Bento",
          month: "2026-10",
          late: true,
        },
        {
          id: "c",
          status: "cancelado",
          total: 999,
          customerKey: "c1",
          customerName: "Ana",
          month: "2026-09",
          late: false,
        },
        { id: "d", status: "pronto", total: 50, customerKey: "c1", customerName: "Ana", month: "2026-09", late: false },
      ],
      [
        { orderId: "a", name: "Cartões", quantity: 100, total: 100 },
        { orderId: "b", name: "Lona", quantity: 1, total: 300 },
        { orderId: "c", name: "Lona", quantity: 5, total: 999 },
      ],
    );
    expect(r.orders).toBe(3);
    expect(r.cancelled).toBe(1);
    expect(r.revenue).toBe(450);
    expect(r.average).toBe(150);
    expect(r.late).toBe(1);
    expect(r.months.map((m) => m.label)).toEqual(["2026-09", "2026-10"]);
    expect(r.customers[0]).toEqual({ label: "Bento", value: 300, count: 1 });
    expect(r.products.map((p) => [p.label, p.count])).toEqual([
      ["Lona", 1],
      ["Cartões", 100],
    ]);
  });
});
