import { describe, expect, it } from "vitest";
import { customerCanCancel, paymentStatusFor, statusAfterApproval, transitionError } from "@/lib/domain/order-status";

describe("statusAfterApproval", () => {
  it("entra em produção com todas as provas aprovadas e o sinal pago", () => {
    expect(
      statusAfterApproval({ itemProofs: ["aprovada", "nao_necessaria"], paid: 500, depositRequired: 500 }),
    ).toEqual({
      status: "em_producao",
      waitingDeposit: false,
    });
  });

  it("fica em aprovação a aguardar o sinal", () => {
    expect(statusAfterApproval({ itemProofs: ["aprovada"], paid: 0, depositRequired: 500 })).toEqual({
      status: "em_aprovacao",
      waitingDeposit: true,
    });
  });

  it("fica em aprovação enquanto houver provas por aprovar", () => {
    expect(statusAfterApproval({ itemProofs: ["aprovada", "enviada"], paid: 999, depositRequired: 0 }).status).toBe(
      "em_aprovacao",
    );
  });
});

describe("customerCanCancel", () => {
  it("só em recebido e sem pagamentos", () => {
    expect(customerCanCancel({ status: "recebido", paid: 0 })).toBe(true);
    expect(customerCanCancel({ status: "recebido", paid: 100 })).toBe(false);
    expect(customerCanCancel({ status: "em_design", paid: 0 })).toBe(false);
  });
});

describe("transitionError", () => {
  const base = { isAdmin: false, itemProofs: ["aprovada" as const], paid: 500, total: 1000, depositRequired: 500 };

  it("só permite as transições da máquina de estados", () => {
    expect(transitionError("recebido", "entregue", base)).toMatch(/não passa/);
    expect(transitionError("em_producao", "pronto", base)).toBeNull();
  });

  it("exige provas aprovadas e sinal para produzir", () => {
    expect(transitionError("em_aprovacao", "em_producao", { ...base, itemProofs: ["enviada"] })).toMatch(/provas/);
    expect(transitionError("em_aprovacao", "em_producao", { ...base, paid: 100 })).toMatch(/sinal/);
    expect(transitionError("em_aprovacao", "em_producao", base)).toBeNull();
  });

  it("exige prova enviada para aprovação, pagamento total para entregar e motivo para cancelar", () => {
    expect(transitionError("recebido", "em_aprovacao", { ...base, itemProofs: ["pendente"] })).toMatch(/prova/);
    expect(transitionError("pronto", "entregue", base)).toMatch(/restante/);
    expect(transitionError("pronto", "entregue", { ...base, paid: 1000 })).toBeNull();
    expect(transitionError("recebido", "cancelado", base)).toMatch(/motivo/);
    expect(transitionError("em_producao", "cancelado", { ...base, reason: "x" })).toMatch(/Administrador/);
    expect(transitionError("em_producao", "cancelado", { ...base, reason: "x", isAdmin: true })).toBeNull();
  });
});

describe("paymentStatusFor", () => {
  it("pendente, parcial e pago", () => {
    expect(paymentStatusFor(0, 100)).toBe("pendente");
    expect(paymentStatusFor(50, 100)).toBe("parcial");
    expect(paymentStatusFor(100, 100)).toBe("pago");
  });
});
