/** Stock e compras (docs/02 · materials, stockMovements, purchaseOrders). Funções puras. */

import type { Cents } from "./money";
import { vatIncluded } from "./pricing";

export const MATERIAL_CATEGORIES = [
  "papel",
  "vinil",
  "lona",
  "tinta",
  "rigido",
  "textil",
  "brinde",
  "embalagem",
  "consumivel",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  papel: "Papel",
  vinil: "Vinil",
  lona: "Lona",
  tinta: "Tinta",
  rigido: "Rígidos (PVC, acrílico)",
  textil: "Têxtil",
  brinde: "Brindes",
  embalagem: "Embalagem",
  consumivel: "Consumíveis",
};

export const UNITS = ["folha", "m2", "ml", "rolo", "unidade", "kg"] as const;
export type StockUnit = (typeof UNITS)[number];

export const UNIT_LABELS: Record<StockUnit, string> = {
  folha: "folhas",
  m2: "m²",
  ml: "m lineares",
  rolo: "rolos",
  unidade: "unidades",
  kg: "kg",
};

export const MOVEMENT_TYPES = ["entrada", "saida", "ajuste", "inventario"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  inventario: "Inventário",
};

/** Quantidades com até 2 casas (m², kg): arredonda para não acumular erros de vírgula flutuante. */
export const roundQty = (value: number) => Math.round(value * 100) / 100;

const qtyFormat = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 });
export const formatQty = (qty: number, unit: StockUnit) => `${qtyFormat.format(qty)} ${UNIT_LABELS[unit]}`;

/**
 * Saldo depois de um movimento. Entradas com custo atualizam o custo médio ponderado; saídas e ajustes não.
 * Devolve null se a saída deixar o stock negativo.
 */
export function applyMovement(
  material: { qty: number; avgCost: Cents; minQty: number },
  delta: number,
  unitCost?: Cents,
): { qty: number; avgCost: Cents; isLow: boolean } | null {
  const qty = roundQty(material.qty + delta);
  if (qty < 0) return null;
  let avgCost = material.avgCost;
  if (delta > 0 && unitCost !== undefined) {
    // Sem arredondar: arredondar a cada entrada acumula erro (143,34 Kz em vez de 143,33); arredonda-se ao mostrar
    avgCost = material.qty <= 0 ? unitCost : (material.qty * material.avgCost + delta * unitCost) / qty;
  }
  return { qty, avgCost, isLow: qty <= material.minQty };
}

export const PO_STATUSES = ["rascunho", "enviada", "parcial", "recebida", "cancelada"] as const;
export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export const PO_STATUS_META: Record<
  PurchaseOrderStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  enviada: { label: "Enviada", tone: "info" },
  parcial: { label: "Recebida em parte", tone: "warning" },
  recebida: { label: "Recebida", tone: "success" },
  cancelada: { label: "Cancelada", tone: "danger" },
};

export type PayableStatus = "por_pagar" | "parcial" | "pago";
export const PAYABLE_LABELS: Record<PayableStatus, string> = {
  por_pagar: "Por pagar",
  parcial: "Pago em parte",
  pago: "Pago",
};

/** Totais da encomenda: custos unitários com IVA incluído, como os preços de venda (quantidades podem ser m²). */
export function purchaseTotals(lines: { qty: number; unitCost: Cents }[], taxRate = 14) {
  const total = lines.reduce((sum, l) => sum + Math.round(l.qty * l.unitCost), 0);
  const tax = vatIncluded(total, taxRate);
  return { subtotal: total - tax, tax, total };
}

/** Estado depois de uma receção: tudo recebido, parte ou nada. */
export function receivedStatus(lines: { qty: number; receivedQty: number }[]): PurchaseOrderStatus {
  if (lines.every((l) => l.receivedQty >= l.qty)) return "recebida";
  return lines.some((l) => l.receivedQty > 0) ? "parcial" : "enviada";
}

export const payableStatus = (paid: Cents, total: Cents): PayableStatus =>
  paid <= 0 ? "por_pagar" : paid >= total ? "pago" : "parcial";

/** Valor do stock ao custo médio (quantidade × custo médio). */
export const stockValue = (rows: { qty: number; avgCost: Cents }[]) =>
  rows.reduce((sum, r) => sum + Math.round(r.qty * r.avgCost), 0);
