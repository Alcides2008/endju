import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("webhook de pagamentos", () => {
  it("só aceita o corpo assinado com o segredo", async () => {
    const { signWebhook, verifyWebhook } = await import("@/lib/payments/provider");
    const body = JSON.stringify({ paymentId: "abc", status: "paid" });
    expect(verifyWebhook(body, signWebhook(body))).toBe(true);
    expect(verifyWebhook(body.replace("abc", "xyz"), signWebhook(body))).toBe(false);
    expect(verifyWebhook(body, null)).toBe(false);
  });
});

vi.mock("@/features/admin/production-start", () => ({ startProductionSafely: vi.fn() }));
vi.mock("@/features/messages/server", () => ({ notifyCustomer: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: vi.fn() }));

/** Pedido falso com o que applyPayment lê; a transação regista o que seria escrito. */
function fakeOrder(fields: Record<string, unknown>, proofs: string[]) {
  const data: Record<string, unknown> = { "totals.total": 10_000, "totals.paid": 0, depositRequired: 5_000, ...fields };
  const order = {
    get: (path: string) => data[path],
    ref: { id: "o1", collection: () => ({ doc: () => ({ id: "e" }) }) },
  } as unknown as FirebaseFirestore.DocumentSnapshot;
  const items = { docs: proofs.map((p) => ({ get: () => p })) } as unknown as FirebaseFirestore.QuerySnapshot;
  const tx = { update: vi.fn(), set: vi.fn() };
  return { order, items, tx: tx as unknown as FirebaseFirestore.Transaction & typeof tx };
}

describe("applyPayment", () => {
  it("com as provas aprovadas, o sinal pago põe o pedido em produção", async () => {
    const { applyPayment } = await import("@/features/payments/server");
    const { order, items, tx } = fakeOrder({ status: "em_aprovacao" }, ["aprovada", "aprovada"]);
    expect(applyPayment(tx, order, items, 5_000, { name: "Teste" })).toEqual({
      paidBefore: 0,
      paid: 5_000,
      toProduction: true,
    });
    expect(tx.update.mock.calls[0][1]).toMatchObject({
      "totals.paid": 5_000,
      "totals.due": 5_000,
      paymentStatus: "parcial",
      status: "em_producao",
    });
  });

  it("com uma prova por aprovar, regista o pagamento sem mudar o estado", async () => {
    const { applyPayment } = await import("@/features/payments/server");
    const { order, items, tx } = fakeOrder({ status: "em_aprovacao" }, ["aprovada", "enviada"]);
    expect(applyPayment(tx, order, items, 5_000, { name: "Teste" }).toProduction).toBe(false);
    expect(tx.update.mock.calls[0][1]).not.toHaveProperty("status", "em_producao");
  });

  it("recusa pagar mais do que falta e pagar um pedido cancelado", async () => {
    const { applyPayment } = await import("@/features/payments/server");
    const paidMost = fakeOrder({ status: "pronto", "totals.paid": 9_000 }, []);
    expect(() => applyPayment(paidMost.tx, paidMost.order, paidMost.items, 2_000, { name: "Teste" })).toThrow(
      /total em falta/,
    );
    expect(paidMost.tx.update).not.toHaveBeenCalled();
    const cancelled = fakeOrder({ status: "cancelado" }, []);
    expect(() => applyPayment(cancelled.tx, cancelled.order, cancelled.items, 1_000, { name: "Teste" })).toThrow(
      /cancelado/,
    );
  });
});

describe("modo de teste dos pagamentos", () => {
  it("fica desligado em produção, com o webhook a exigir segredo próprio", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_WEBHOOK_SECRET", "");
    vi.resetModules();
    const { isTestMode, onlinePaymentsEnabled, signWebhook, verifyWebhook } = await import("@/lib/payments/provider");
    expect(isTestMode()).toBe(false);
    expect(onlinePaymentsEnabled()).toBe(false);
    expect(verifyWebhook("{}", signWebhook("{}"))).toBe(false);
    vi.unstubAllEnvs();
  });
});
