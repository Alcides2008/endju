import { describe, expect, it } from "vitest";
import { matchPayment, nextMonth, parseAmount, parseStatementCsv, vatForMonth } from "@/lib/domain/finance";

describe("nextMonth", () => {
  it("passa para o mês seguinte sem saltar o fim do mês", () => {
    expect(nextMonth("2026-10-28")).toBe("2026-11-28");
    expect(nextMonth("2027-01-31")).toBe("2027-02-28");
    expect(nextMonth("2026-12-15")).toBe("2027-01-15");
  });
});

describe("parseAmount", () => {
  it("lê valores à portuguesa e à inglesa", () => {
    expect(parseAmount("1.234,56")).toBe(123456);
    expect(parseAmount("1 234,56 Kz")).toBe(123456);
    expect(parseAmount("28000.00")).toBe(2800000);
    expect(parseAmount("1.250.000")).toBe(125000000);
    expect(parseAmount("")).toBeNull();
  });
});

describe("parseStatementCsv", () => {
  it("encontra as colunas pelo cabeçalho e fica só com as entradas", () => {
    const csv = [
      "Data;Descrição;Débito;Crédito;Referência",
      '27/10/2026;"TRF EDJ-2026-00001; Cliente QA";;28.000,00;TRF-1',
      "27/10/2026;Pagamento renda;150.000,00;;",
      "2026-10-28;Depósito balcão;;5 000,00;",
    ].join("\n");
    const { lines, error } = parseStatementCsv(csv);
    expect(error).toBeUndefined();
    expect(lines).toEqual([
      { day: "2026-10-27", description: "TRF EDJ-2026-00001; Cliente QA", amount: 2800000, reference: "TRF-1" },
      { day: "2026-10-28", description: "Depósito balcão", amount: 500000, reference: "" },
    ]);
  });

  it("explica quando não reconhece o ficheiro", () => {
    expect(parseStatementCsv("a,b\n1,2").error).toMatch(/colunas/);
  });
});

describe("matchPayment", () => {
  const line = { day: "2026-10-27", description: "TRF EDJ-2026-00001", amount: 2800000, reference: "" };
  it("prefere o pagamento com o número do pedido no descritivo", () => {
    const match = matchPayment(line, [
      { id: "a", day: "2026-10-26", amount: 2800000, orderNumber: "EDJ-2026-00009", reference: "" },
      { id: "b", day: "2026-10-24", amount: 2800000, orderNumber: "EDJ-2026-00001", reference: "" },
    ]);
    expect(match?.id).toBe("b");
  });

  it("com dois do mesmo valor e nada que os distinga, não adivinha", () => {
    expect(
      matchPayment({ ...line, description: "TRF" }, [
        { id: "a", day: "2026-10-26", amount: 2800000, orderNumber: "X", reference: "" },
        { id: "b", day: "2026-10-27", amount: 2800000, orderNumber: "Y", reference: "" },
      ]),
    ).toBeNull();
  });

  it("ignora valores diferentes e datas longe", () => {
    expect(
      matchPayment(line, [{ id: "a", day: "2026-10-10", amount: 2800000, orderNumber: "Z", reference: "" }]),
    ).toBeNull();
  });
});

describe("vatForMonth", () => {
  it("liquidado pelas faturas menos notas de crédito; dedutível pelas despesas e compras", () => {
    const vat = vatForMonth("2026-10", {
      invoices: [
        { day: "2026-10-05", type: "fatura", tax: 14000, total: 114000, status: "emitida" },
        { day: "2026-10-06", type: "recibo", tax: 14000, total: 114000, status: "emitida" },
        { day: "2026-10-07", type: "nota_credito", tax: 1400, total: 11400, status: "emitida" },
        { day: "2026-10-08", type: "fatura", tax: 9999, total: 99999, status: "anulada" },
        { day: "2026-11-01", type: "fatura", tax: 5000, total: 50000, status: "emitida" },
      ],
      expenses: [{ day: "2026-10-10", tax: 2000 }],
      purchases: [{ day: "2026-10-20", tax: 3000 }],
    });
    expect(vat).toEqual({
      sales: 102600,
      output: 12600,
      fromExpenses: 2000,
      fromPurchases: 3000,
      deductible: 5000,
      balance: 7600,
    });
  });
});
