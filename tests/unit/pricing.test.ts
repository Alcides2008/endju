import { describe, expect, it } from "vitest";
import { PRODUCTS } from "@/content/products";
import { defaultConfig } from "@/lib/domain/catalog";
import {
  addWorkingDays,
  couponDiscount,
  orderTotals,
  PricingError,
  priceItem,
  quoteTotals,
  tierUnitPrice,
  vatIncluded,
  type Coupon,
} from "@/lib/domain/pricing";

const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
const cards = getProduct("cartoes-de-visita")!;
const banner = getProduct("lona")!;
const boxes = getProduct("caixas-de-envio")!;

describe("vatIncluded", () => {
  it("separa o IVA de 14 % contido no preço", () => {
    expect(vatIncluded(11400, 14)).toBe(1400);
    expect(vatIncluded(0, 14)).toBe(0);
  });
});

describe("tierUnitPrice", () => {
  const tiers = [
    { minQty: 100, unitPrice: 12500 },
    { minQty: 500, unitPrice: 5200 },
  ];
  it("usa o maior escalão que não passa da quantidade", () => {
    expect(tierUnitPrice(tiers, 100)).toBe(12500);
    expect(tierUnitPrice(tiers, 499)).toBe(12500);
    expect(tierUnitPrice(tiers, 500)).toBe(5200);
  });
});

describe("priceItem", () => {
  it("100 cartões simples custam 12 500 Kz, como o 'a partir de' da página", () => {
    const price = priceItem(cards, defaultConfig(cards));
    expect(price.lineTotal).toBe(1_250_000);
    expect(price.unitPrice).toBe(12_500);
    expect(price.lineTax).toBe(vatIncluded(1_250_000, 14));
  });

  it("soma modificadores por unidade, percentagem, fixos, urgência e design", () => {
    const config = {
      ...defaultConfig(cards),
      quantity: 500,
      options: { papel: "couche-350", impressao: "frente-verso", acabamento: "hot-stamping" },
      urgent: true,
      design: "endju_cria" as const,
    };
    const base = 500 * 5200; // escalão 500
    const extras = (base * 30) / 100 + 500 * 6000 + 1_500_000;
    const expected = Math.round(base + extras + ((base + extras) * 50) / 100) + 1_500_000;
    expect(priceItem(cards, config).lineTotal).toBe(expected);
  });

  it("o total é sempre a soma do detalhe mostrado", () => {
    for (const product of PRODUCTS) {
      const price = priceItem(product, defaultConfig(product));
      expect(price.breakdown.reduce((sum, part) => sum + part.amount, 0)).toBe(price.lineTotal);
    }
  });

  it("calcula lonas por m², com área mínima", () => {
    const config = { ...defaultConfig(banner), size: { widthCm: 300, heightCm: 200 } };
    expect(priceItem(banner, config).lineTotal).toBe(6 * 850_000);
    const tiny = { ...config, size: { widthCm: 40, heightCm: 40 } };
    expect(priceItem(banner, tiny).lineTotal).toBe(850_000); // 0,16 m² cobrado como 1 m²
  });

  it("inclui o custo de preparação uma só vez", () => {
    const price = priceItem(boxes, defaultConfig(boxes));
    expect(price.breakdown.some((part) => part.label === "Preparação e arranque")).toBe(true);
    expect(price.lineTotal).toBe(100 * 95_000 + 2_500_000);
  });

  it("rejeita quantidade abaixo do mínimo, opção inexistente e medidas fora dos limites", () => {
    expect(() => priceItem(cards, { ...defaultConfig(cards), quantity: 50 })).toThrow(PricingError);
    expect(() =>
      priceItem(cards, { ...defaultConfig(cards), options: { ...defaultConfig(cards).options, papel: "ouro" } }),
    ).toThrow(PricingError);
    expect(() => priceItem(banner, { ...defaultConfig(banner), size: { widthCm: 5000, heightCm: 100 } })).toThrow(
      PricingError,
    );
  });
});

describe("couponDiscount", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  const base: Coupon = {
    type: "percent",
    value: 10,
    startsAt: new Date("2026-10-01"),
    usedCount: 0,
    firstOrderOnly: false,
    active: true,
  };
  const ctx = { itemsTotal: 1_000_000, delivery: 500_000, now, isFirstOrder: true };

  it("aplica percentagem, valor fixo e entrega grátis", () => {
    expect(couponDiscount(base, ctx)).toEqual({ ok: true, discount: 100_000 });
    expect(couponDiscount({ ...base, type: "fixed", value: 2_000_000 }, ctx)).toEqual({
      ok: true,
      discount: 1_000_000,
    });
    expect(couponDiscount({ ...base, type: "free_delivery", value: 0 }, ctx)).toEqual({ ok: true, discount: 500_000 });
  });

  it("respeita limite máximo, mínimo, datas, utilizações e primeira encomenda", () => {
    expect(couponDiscount({ ...base, maxDiscount: 50_000 }, ctx)).toEqual({ ok: true, discount: 50_000 });
    expect(couponDiscount({ ...base, minSubtotal: 2_000_000 }, ctx).ok).toBe(false);
    expect(couponDiscount({ ...base, endsAt: new Date("2026-10-20") }, ctx).ok).toBe(false);
    expect(couponDiscount({ ...base, usageLimit: 5, usedCount: 5 }, ctx).ok).toBe(false);
    expect(couponDiscount({ ...base, firstOrderOnly: true }, { ...ctx, isFirstOrder: false }).ok).toBe(false);
  });
});

describe("orderTotals", () => {
  it("base + IVA = total, e o sinal é metade", () => {
    const lines = [{ lineTotal: 1_140_000, lineTax: vatIncluded(1_140_000, 14) }];
    const totals = orderTotals({ lines, discount: 114_000, delivery: 500_000, taxRate: 14, depositPct: 50 });
    expect(totals.total).toBe(1_140_000 - 114_000 + 500_000);
    expect(totals.subtotal + totals.tax).toBe(totals.total);
    expect(totals.tax).toBe(140_000 - 14_000 + vatIncluded(500_000, 14));
    expect(totals.depositRequired).toBe(Math.round(totals.total / 2));
  });
});

describe("quoteTotals", () => {
  it("soma as linhas com IVA incluído e desconta o IVA do desconto", () => {
    const totals = quoteTotals(
      [
        { quantity: 2, unitPrice: 570_000 },
        { quantity: 1, unitPrice: 114_000 },
      ],
      114_000,
    );
    expect(totals.total).toBe(1_140_000);
    expect(totals.tax).toBe(140_000);
    expect(totals.subtotal + totals.tax).toBe(totals.total);
  });
});

describe("addWorkingDays", () => {
  it("salta os domingos", () => {
    const saturday = new Date(2026, 9, 31); // sábado, 31 de outubro
    expect(addWorkingDays(saturday, 1).getDay()).toBe(1); // segunda
    expect(addWorkingDays(saturday, 0).getDate()).toBe(31);
  });
});
