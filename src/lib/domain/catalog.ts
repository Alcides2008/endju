import type { Cents } from "./money";
import type { PricedProduct } from "./pricing";
import { roundQty } from "./stock";
import type { ProductionSector } from "./production";
import type { Media, SiteImage } from "@/lib/media";

/**
 * Catálogo (docs/02 · products, services): tipos e regras puras, usados no site, no checkout e no painel.
 * Os dados vivem no Firestore; os ficheiros de src/content só servem para a primeira importação.
 * Valores em cêntimos, com IVA.
 */
export type Preview = "card" | "flat" | "rollup" | "banner" | "box" | "vest" | "photo";

/** Baixa de stock ao entrar em produção: quanto material gasta cada unidade (ou m², ou folha) do produto. */
export type ConsumptionRule = {
  materialId: string;
  per: "unit" | "m2" | "sheet";
  qty: number; // ex.: 0,05 folhas SRA3 por cartão (21 por folha)
  wastePct: number; // desperdício de afinação
  when?: { group: string; choice: string }; // só se esta opção estiver escolhida
};

export type ProductBase = PricedProduct & {
  slug: string;
  serviceSlug: string;
  summary: string;
  preview: Preview;
  /** Fotografia da lista de produtos; sem fotografia, a lista mostra a ilustração da pré-visualização */
  image: SiteImage | null;
  /** Tamanho final da arte em cm, para calcular os DPI do ficheiro (as medidas livres usam o tamanho escolhido) */
  printSizeCm?: { width: number; height: number };
  /** Tamanho da arte que muda com uma opção (formato do flyer, tamanho do roll-up, tampa da caixa) */
  printSizeByOption?: { group: string; sizes: Record<string, { width: number; height: number }> };
  quantityPresets: number[];
  unit: string; // "cartões", "m²"…
  leadTime: { normalDays: number; urgentDays: number };
  allowDesignService: boolean;
  fileRequirements: { formats: string[]; minDpi: number; bleedMm: number; maxSizeMb: number };
};

export type Product = ProductBase & {
  route: ProductionSector[];
  consumption: ConsumptionRule[];
  active: boolean;
  sortOrder: number;
};

/** Como fica no Firestore: a imagem é uma referência, não um import. */
export type ProductDoc = Omit<Product, "image"> & { image: Media | null };

export type GalleryImage = SiteImage & {
  /** Trabalho real (nome do projeto) ou "Visualização" para imagens geradas do produto. */
  caption: string;
};

export type ServiceBase = {
  slug: string;
  name: string;
  summary: string;
  priceFrom: Cents;
  unit: string;
  leadTime: string;
  tags: string[];
  intro: string;
  body: string[];
  products: string[];
  specs: { title: string; items: { name: string; detail: string }[] };
  deadlines: { item: string; normal: string; urgent: string | null }[];
  gallery: GalleryImage[];
};

export type Service = ServiceBase & { active: boolean; sortOrder: number };

export type ServiceDoc = Omit<Service, "gallery"> & { gallery: (Media & { caption: string })[] };

/** O que o browser recebe: sem o percurso nem o consumo de materiais, que são dados internos da oficina. */
export function publicProduct({
  route: _r,
  consumption: _c,
  active: _a,
  sortOrder: _s,
  ...product
}: Product): ProductBase {
  return product;
}

/** Configuração inicial: as escolhas marcadas como default (ou a primeira), a medida sugerida e o mínimo. */
export function defaultConfig(product: ProductBase) {
  const options: Record<string, string> = {};
  let size: { widthCm: number; heightCm: number } | undefined;
  for (const group of product.optionGroups) {
    if (group.type === "select" && group.choices) {
      options[group.key] = (group.choices.find((c) => c.default) ?? group.choices[0]).key;
    } else if (group.size) {
      size = { widthCm: group.size.defaultCm.width, heightCm: group.size.defaultCm.height };
    }
  }
  return { options, size, quantity: product.minQty, urgent: false, design: "cliente_envia" as const };
}

/** Escolhas legíveis para o carrinho e o pedido: "Papel: Couché mate 350 g". */
export function describeOptions(product: ProductBase, options: Record<string, string>) {
  return product.optionGroups
    .filter((group) => group.type === "select")
    .map((group) => {
      const choice = group.choices?.find((c) => c.key === options[group.key]);
      return { group: group.key, label: group.label, choice: options[group.key], choiceLabel: choice?.label ?? "" };
    });
}

/** Tamanho final da arte em cm para a configuração atual (medidas livres, opção ou tamanho fixo). */
export function printSize(
  product: ProductBase,
  config: { options: Record<string, string>; size?: { widthCm: number; heightCm: number } },
) {
  if (config.size) return { width: config.size.widthCm, height: config.size.heightCm };
  const byOption = product.printSizeByOption;
  if (byOption) return byOption.sizes[config.options[byOption.group]] ?? null;
  return product.printSizeCm ?? null;
}

/** Altura das caixas em cm, por tamanho (só para a pré-visualização). */
export const BOX_DEPTH_CM: Record<string, number> = { p: 5, m: 8, g: 12 };

/** Cor do colete escolhida (para a pré-visualização). */
export const VEST_COLORS: Record<string, string> = { amarelo: "#d9f20b", laranja: "#ff6a13" };

/**
 * Material que um item gasta, por material: unidades × regra, ou m² × regra, mais o desperdício.
 * Folhas arredondam para cima (não se gasta meia folha). Regras com `when` só contam com essa opção escolhida.
 */
export function consumptionFor(
  rules: ConsumptionRule[],
  item: { quantity: number; options: Record<string, string>; size?: { widthCm: number; heightCm: number } },
): Map<string, number> {
  const total = new Map<string, number>();
  for (const rule of rules) {
    if (rule.when && item.options[rule.when.group] !== rule.when.choice) continue;
    const area = item.size ? ((item.size.widthCm * item.size.heightCm) / 10_000) * item.quantity : 0;
    const base = rule.per === "m2" ? area : item.quantity;
    let qty = base * rule.qty * (1 + rule.wastePct / 100);
    qty = rule.per === "sheet" ? Math.ceil(qty - 1e-9) : roundQty(qty);
    if (qty > 0) total.set(rule.materialId, roundQty((total.get(rule.materialId) ?? 0) + qty));
  }
  return total;
}
