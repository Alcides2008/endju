import { describeOptions, type ProductBase } from "@/lib/domain/catalog";
import { priceItem, PricingError, type ItemPrice } from "@/lib/domain/pricing";
import type { CartItem } from "./store";

export type PricedLine =
  | { ok: true; item: CartItem; product: ProductBase; price: ItemPrice; name: string; details: string[] }
  | { ok: false; item: CartItem; error: string };

/** Preço e descrição de uma linha do carrinho. O mesmo cálculo corre no browser e no checkout do servidor. */
export function priceLine(item: CartItem, products: ProductBase[]): PricedLine {
  const product = products.find((p) => p.slug === item.productSlug);
  if (!product) return { ok: false, item, error: "Este produto já não está disponível." };
  try {
    const price = priceItem(product, item);
    const details = describeOptions(product, item.options).map((option) => option.choiceLabel);
    if (item.size) details.unshift(`${item.size.widthCm} × ${item.size.heightCm} cm`);
    return { ok: true, item, product, price, name: product.name, details };
  } catch (error) {
    return { ok: false, item, error: error instanceof PricingError ? error.message : "Configuração inválida." };
  }
}
