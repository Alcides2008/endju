import { describe, expect, it } from "vitest";
import { minutesWorked, planTasks, routeFor, waitingFor, type TaskStatus } from "@/lib/domain/production";
import { consumptionFor } from "@/lib/domain/catalog";
import { applyMovement, payableStatus, purchaseTotals, receivedStatus } from "@/lib/domain/stock";

describe("planTasks", () => {
  it("cria um setor do percurso por item, cada um à espera do anterior", () => {
    const tasks = planTasks("o1", [
      { id: "a", productId: "cartoes-de-visita" },
      { id: "b", productId: "personalizado" },
    ]);
    expect(tasks.map((t) => t.id)).toEqual([
      "o1_a_impressao",
      "o1_a_corte",
      "o1_a_acabamento",
      "o1_b_impressao",
      "o1_b_acabamento",
    ]);
    expect(tasks[1].dependsOn).toEqual(["o1_a_impressao"]);
    expect(tasks[0].dependsOn).toEqual([]);
    expect(routeFor("desconhecido")).toEqual(["impressao", "acabamento"]);
  });
});

describe("waitingFor", () => {
  it("diz qual o setor anterior que ainda não acabou", () => {
    const deps = new Map<string, { status: TaskStatus; sector: "impressao" }>([
      ["x", { status: "em_curso", sector: "impressao" }],
    ]);
    expect(waitingFor({ dependsOn: ["x"] }, deps)).toBe("impressao");
    deps.set("x", { status: "concluida", sector: "impressao" });
    expect(waitingFor({ dependsOn: ["x"] }, deps)).toBeNull();
  });
});

describe("minutesWorked", () => {
  it("soma registos fechados e o aberto até agora", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    const logs = [
      { userId: "u", start: new Date("2026-10-27T09:00:00Z"), end: new Date("2026-10-27T09:45:00Z") },
      { userId: "u", start: new Date("2026-10-27T11:30:00Z") },
    ];
    expect(minutesWorked(logs, now)).toBe(75);
  });
});

describe("applyMovement", () => {
  const material = { qty: 10, avgCost: 1000, minQty: 5 };

  it("entrada com custo atualiza o custo médio ponderado", () => {
    expect(applyMovement(material, 10, 2000)).toEqual({ qty: 20, avgCost: 1500, isLow: false });
  });

  it("saída não mexe no custo e marca stock baixo no mínimo", () => {
    expect(applyMovement(material, -5)).toEqual({ qty: 5, avgCost: 1000, isLow: true });
  });

  it("recusa saída que deixa o stock negativo", () => {
    expect(applyMovement(material, -10.5)).toBeNull();
  });

  it("várias entradas não acumulam erro de arredondamento", () => {
    const first = applyMovement({ qty: 500, avgCost: 150_00, minQty: 0 }, 600, 140_00)!;
    const second = applyMovement({ ...first, minQty: 0 }, 400, 140_00)!;
    expect(Math.round(second.avgCost)).toBe(143_33);
  });

  it("sem stock, a primeira entrada define o custo", () => {
    expect(applyMovement({ qty: 0, avgCost: 0, minQty: 0 }, 2.5, 4000)?.avgCost).toBe(4000);
  });

  it("arredonda m² a duas casas", () => {
    expect(applyMovement({ qty: 0.1, avgCost: 0, minQty: 0 }, 0.2)?.qty).toBe(0.3);
  });
});

describe("compras", () => {
  it("totais com IVA incluído e quantidades decimais", () => {
    expect(purchaseTotals([{ qty: 12.5, unitCost: 114_00 }])).toEqual({
      subtotal: 1250_00,
      tax: 175_00,
      total: 1425_00,
    });
  });

  it("estado da receção e do pagamento", () => {
    expect(receivedStatus([{ qty: 10, receivedQty: 10 }])).toBe("recebida");
    expect(
      receivedStatus([
        { qty: 10, receivedQty: 4 },
        { qty: 2, receivedQty: 0 },
      ]),
    ).toBe("parcial");
    expect(receivedStatus([{ qty: 10, receivedQty: 0 }])).toBe("enviada");
    expect(payableStatus(0, 100)).toBe("por_pagar");
    expect(payableStatus(50, 100)).toBe("parcial");
    expect(payableStatus(100, 100)).toBe("pago");
  });
});

describe("consumptionFor", () => {
  const rules = [
    { materialId: "papel", per: "sheet" as const, qty: 1 / 21, wastePct: 5 },
    {
      materialId: "lam",
      per: "sheet" as const,
      qty: 1 / 21,
      wastePct: 0,
      when: { group: "acabamento", choice: "laminacao" },
    },
    { materialId: "lona", per: "m2" as const, qty: 1, wastePct: 10 },
  ];

  it("folhas por unidade arredondam para cima, com desperdício", () => {
    const used = consumptionFor(rules, { quantity: 500, options: { acabamento: "sem" } });
    expect(used.get("papel")).toBe(25); // 500 / 21 × 1,05 = 25
    expect(used.has("lam")).toBe(false);
    expect(used.has("lona")).toBe(false); // sem medidas não há m²
  });

  it("m² pela medida × quantidade, e regras só com a opção escolhida", () => {
    const used = consumptionFor(rules, {
      quantity: 2,
      options: { acabamento: "laminacao" },
      size: { widthCm: 300, heightCm: 200 },
    });
    expect(used.get("lona")).toBe(13.2); // 6 m² × 2 × 1,10
    expect(used.get("lam")).toBe(1);
  });
});
