import type { Cents } from "./money";

/**
 * Motor de preço (docs/02-modelo-de-dados.md · PricingRules). Função pura: o configurador usa-a para a
 * estimativa em tempo real e o servidor volta a calculá-la no checkout, ignorando o preço vindo do browser.
 * Os preços do catálogo já incluem IVA (decisão 1): o IVA é separado no fim, ao cêntimo, por linha.
 */

export type OptionChoice = { key: string; label: string; default?: boolean };
export type OptionGroup = {
  key: string;
  label: string;
  type: "select" | "size";
  choices?: OptionChoice[];
  size?: { minCm: number; maxCm: number; stepCm: number; defaultCm: { width: number; height: number } };
};

export type PriceModifier = {
  group: string;
  choice: string;
  type: "add_unit" | "add_m2" | "add_fixed" | "percent";
  value: number; // cêntimos (add_*) ou percentagem (percent)
};

export type PricingRules = {
  model: "tiered_unit" | "area_m2" | "fixed";
  tiers?: { minQty: number; unitPrice: Cents }[];
  pricePerM2?: Cents;
  minAreaM2?: number;
  fixedPrice?: Cents;
  setupFee?: Cents;
  modifiers: PriceModifier[];
  urgentSurchargePct: number;
  designFee?: Cents;
};

export type PricedProduct = {
  name: string;
  optionGroups: OptionGroup[];
  pricing: PricingRules;
  minQty: number;
  taxRate: number;
};

export type ItemConfig = {
  options: Record<string, string>;
  size?: { widthCm: number; heightCm: number };
  quantity: number;
  urgent: boolean;
  design: "cliente_envia" | "endju_cria";
};

export type ItemPrice = {
  lineTotal: Cents; // com IVA
  unitPrice: Cents; // com IVA, arredondado (só para mostrar)
  lineTax: Cents;
  breakdown: { label: string; amount: Cents }[];
};

export class PricingError extends Error {}

/** Parte de IVA contida num valor com IVA, ao cêntimo. 114 Kz a 14 % → 14 Kz de IVA. */
export function vatIncluded(gross: Cents, rate: number): Cents {
  return gross - Math.round((gross * 100) / (100 + rate));
}

/** Preço unitário do escalão aplicável (o maior minQty que não passa da quantidade). */
export function tierUnitPrice(tiers: { minQty: number; unitPrice: Cents }[], quantity: number): Cents {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const tier = sorted.filter((t) => t.minQty <= quantity).at(-1) ?? sorted[0];
  if (!tier) throw new PricingError("Produto sem escalões de preço.");
  return tier.unitPrice;
}

/** Valida a configuração contra o produto: opções existentes, medidas dentro dos limites, quantidade mínima. */
export function validateConfig(product: PricedProduct, config: ItemConfig): string | null {
  if (!Number.isInteger(config.quantity) || config.quantity < product.minQty) {
    return `A quantidade mínima é ${product.minQty}.`;
  }
  if (config.quantity > 100_000) return "Para quantidades acima de 100 000, pede um orçamento personalizado.";
  for (const group of product.optionGroups) {
    if (group.type === "select") {
      const choice = config.options[group.key];
      if (!group.choices?.some((c) => c.key === choice)) return `Escolhe ${group.label.toLowerCase()}.`;
    } else if (group.size) {
      const { minCm, maxCm } = group.size;
      const size = config.size;
      if (!size || [size.widthCm, size.heightCm].some((v) => !Number.isFinite(v) || v < minCm || v > maxCm)) {
        return `As medidas têm de estar entre ${minCm} e ${maxCm} cm.`;
      }
    }
  }
  return null;
}

/** Preço de uma linha do carrinho. Lança PricingError se a configuração não for válida. */
export function priceItem(product: PricedProduct, config: ItemConfig): ItemPrice {
  const invalid = validateConfig(product, config);
  if (invalid) throw new PricingError(invalid);

  const { pricing } = product;
  const qty = config.quantity;
  const areaPerUnit = config.size
    ? Math.max((config.size.widthCm * config.size.heightCm) / 10_000, pricing.minAreaM2 ?? 0)
    : 0;
  const totalArea = areaPerUnit * qty;
  const breakdown: { label: string; amount: Cents }[] = [];

  let base: number;
  if (pricing.model === "tiered_unit") {
    const unit = tierUnitPrice(pricing.tiers ?? [], qty);
    base = unit * qty;
  } else if (pricing.model === "area_m2") {
    base = (pricing.pricePerM2 ?? 0) * totalArea;
  } else {
    base = (pricing.fixedPrice ?? 0) * qty;
  }
  breakdown.push({ label: `${product.name} × ${qty}`, amount: Math.round(base) });

  let extras = 0;
  for (const mod of pricing.modifiers) {
    if (config.options[mod.group] !== mod.choice) continue;
    const amount =
      mod.type === "add_unit"
        ? mod.value * qty
        : mod.type === "add_m2"
          ? mod.value * totalArea
          : mod.type === "add_fixed"
            ? mod.value
            : (base * mod.value) / 100;
    const group = product.optionGroups.find((g) => g.key === mod.group);
    const label = group?.choices?.find((c) => c.key === mod.choice)?.label ?? mod.choice;
    // Uma opção pode ter várias parcelas (ex.: hot stamping por unidade + clichê): mostra-se numa só linha
    const same = breakdown.find((part) => part.label === label);
    if (same) same.amount += Math.round(amount);
    else breakdown.push({ label, amount: Math.round(amount) });
    extras += amount;
  }

  if (pricing.setupFee) {
    breakdown.push({ label: "Preparação e arranque", amount: pricing.setupFee });
    extras += pricing.setupFee;
  }

  const beforeUrgency = base + extras;
  if (config.urgent && pricing.urgentSurchargePct > 0) {
    const surcharge = (beforeUrgency * pricing.urgentSurchargePct) / 100;
    breakdown.push({ label: `Urgente (+${pricing.urgentSurchargePct} %)`, amount: Math.round(surcharge) });
  }
  if (config.design === "endju_cria" && pricing.designFee) {
    breakdown.push({ label: "Design pela Endju", amount: pricing.designFee });
  }

  // O total é a soma das parcelas já arredondadas: o detalhe mostrado bate sempre certo com o total
  const lineTotal = breakdown.reduce((sum, part) => sum + part.amount, 0);
  return {
    lineTotal,
    unitPrice: Math.round(lineTotal / qty),
    lineTax: vatIncluded(lineTotal, product.taxRate),
    breakdown,
  };
}

// ── Totais do pedido ────────────────────────────────────────────────────────

export type Coupon = {
  type: "percent" | "fixed" | "free_delivery";
  value: number;
  minSubtotal?: Cents;
  maxDiscount?: Cents;
  startsAt: Date;
  endsAt?: Date;
  usageLimit?: number;
  usedCount: number;
  firstOrderOnly: boolean;
  active: boolean;
};

export type CouponResult = { ok: true; discount: Cents } | { ok: false; reason: string };

/** Desconto de um cupão sobre os produtos (ou a entrega, em free_delivery). Nunca passa do valor descontado. */
export function couponDiscount(
  coupon: Coupon,
  ctx: { itemsTotal: Cents; delivery: Cents; now: Date; isFirstOrder: boolean },
): CouponResult {
  if (!coupon.active || ctx.now < coupon.startsAt || (coupon.endsAt && ctx.now > coupon.endsAt)) {
    return { ok: false, reason: "Este cupão não está ativo." };
  }
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "Este cupão já atingiu o limite de utilizações." };
  }
  if (coupon.firstOrderOnly && !ctx.isFirstOrder) {
    return { ok: false, reason: "Este cupão é só para a primeira encomenda." };
  }
  if (coupon.minSubtotal && ctx.itemsTotal < coupon.minSubtotal) {
    return { ok: false, reason: "O valor dos produtos ainda não chega ao mínimo deste cupão." };
  }
  let discount =
    coupon.type === "percent"
      ? Math.round((ctx.itemsTotal * coupon.value) / 100)
      : coupon.type === "fixed"
        ? coupon.value
        : ctx.delivery;
  if (coupon.maxDiscount !== undefined) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, coupon.type === "free_delivery" ? ctx.delivery : ctx.itemsTotal);
  return { ok: true, discount };
}

export type OrderTotals = {
  items: Cents; // produtos, com IVA
  discount: Cents;
  delivery: Cents;
  total: Cents; // com IVA
  tax: Cents; // IVA contido no total
  subtotal: Cents; // base tributável = total − IVA
  depositRequired: Cents;
};

/**
 * Totais com IVA ao cêntimo por linha: o IVA de cada produto, menos o IVA do desconto, mais o IVA da entrega.
 * A entrega leva a mesma taxa (serviço tributado a 14 %).
 */
export function orderTotals(input: {
  lines: { lineTotal: Cents; lineTax: Cents }[];
  discount: Cents;
  delivery: Cents;
  taxRate: number;
  depositPct: number;
}): OrderTotals {
  const items = input.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const itemsTax = input.lines.reduce((sum, line) => sum + line.lineTax, 0);
  const discount = Math.min(input.discount, items + input.delivery);
  const total = items - discount + input.delivery;
  const tax = itemsTax - vatIncluded(discount, input.taxRate) + vatIncluded(input.delivery, input.taxRate);
  return {
    items,
    discount,
    delivery: input.delivery,
    total,
    tax,
    subtotal: total - tax,
    depositRequired: Math.round((total * input.depositPct) / 100),
  };
}

/** Totais de uma proposta: preços unitários com IVA, sem entrega (combina-se ao converter em pedido). */
export function quoteTotals(lines: { quantity: number; unitPrice: Cents }[], discount: Cents, taxRate = 14) {
  const t = orderTotals({
    lines: lines.map((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      return { lineTotal, lineTax: vatIncluded(lineTotal, taxRate) };
    }),
    discount,
    delivery: 0,
    taxRate,
    depositPct: 0,
  });
  return { subtotal: t.subtotal, discount: t.discount, tax: t.tax, total: t.total };
}

/** Soma dias úteis (segunda a sábado por omissão) a uma data. */
export function addWorkingDays(from: Date, days: number, workingDays: number[] = [1, 2, 3, 4, 5, 6]): Date {
  const date = new Date(from);
  let left = days;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (workingDays.includes(date.getDay())) left--;
  }
  return date;
}
