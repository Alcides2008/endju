/** Valores em cêntimos inteiros de Kz (docs/02-modelo-de-dados.md). */
export type Cents = number;

const kz = new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA" });
const kzWhole = new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 });

/** 18696000 → "186 960,00 Kz" */
export function formatKz(cents: Cents): string {
  return kz.format(cents / 100);
}

/** Para preços de catálogo arredondados: 850000 → "8 500 Kz" */
export function formatKzWhole(cents: Cents): string {
  return kzWhole.format(Math.round(cents / 100));
}

/** Número escrito à portuguesa nos formulários: "12 500,5" → 12500.5; NaN se não for número. */
export const parseDecimal = (value: string) => Number(value.replace(/\s/g, "").replace(",", "."));

/** "12 500,50" → 1250050 cêntimos; NaN se não for número. */
export const toCents = (value: string) => Math.round(parseDecimal(value) * 100);

/** 1250050 → "12500,5", para preencher um campo de valor. */
export const fromCents = (cents: number) => String(Math.round(cents) / 100).replace(".", ",");
