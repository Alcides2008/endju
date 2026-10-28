import cartoes from "@/assets/hero/cartoes.webp";
import grandeFormato from "@/assets/hero/grande-formato.webp";
import oficina from "@/assets/hero/oficina.webp";
import bonesBordados from "@/assets/portfolio/bones-bordados.webp";
import efaiOutdoor from "@/assets/portfolio/efai-saude-outdoor-2.webp";
import efaiViatura from "@/assets/portfolio/efai-saude-viatura-2.webp";
import tshirts from "@/assets/portfolio/t-shirts-jiu-jitsu-3.webp";
import type { ProductBase } from "@/lib/domain/catalog";

/**
 * Produtos do configurador tal como estavam no código antes do catálogo no Firestore (Etapa 6.3).
 * Só servem para a primeira importação no painel (Catálogo → Importar); depois edita-se lá.
 * Valores em cêntimos, com IVA. Preços de referência de mercado em Luanda: confirmar com a tabela da Endju.
 */
const PRINT_FILES = ["pdf", "ai", "psd", "png", "jpg", "tiff"];
const kz = (value: number) => value * 100;

export const PRODUCTS: ProductBase[] = [
  {
    slug: "cartoes-de-visita",
    serviceSlug: "papelaria",
    name: "Cartões de visita",
    summary: "85 × 55 mm em couché de 350 g, com laminação, soft-touch ou hot stamping a ouro.",
    preview: "card",
    image: { src: cartoes, alt: "Cartões de visita com versos em degradê e cartão preto com logo a ouro" },
    printSizeCm: { width: 8.5, height: 5.5 },
    optionGroups: [
      {
        key: "papel",
        label: "Papel",
        type: "select",
        choices: [
          { key: "couche-350", label: "Couché mate 350 g", default: true },
          { key: "texturado-300", label: "Papel texturado 300 g" },
        ],
      },
      {
        key: "impressao",
        label: "Impressão",
        type: "select",
        choices: [
          { key: "frente", label: "Só frente", default: true },
          { key: "frente-verso", label: "Frente e verso" },
        ],
      },
      {
        key: "acabamento",
        label: "Acabamento",
        type: "select",
        choices: [
          { key: "sem", label: "Sem acabamento", default: true },
          { key: "laminacao-mate", label: "Laminação mate" },
          { key: "soft-touch", label: "Laminação soft-touch" },
          { key: "hot-stamping", label: "Hot stamping a ouro" },
        ],
      },
    ],
    pricing: {
      model: "tiered_unit",
      tiers: [
        { minQty: 100, unitPrice: kz(125) },
        { minQty: 250, unitPrice: kz(80) },
        { minQty: 500, unitPrice: kz(52) },
        { minQty: 1000, unitPrice: kz(34) },
        { minQty: 2000, unitPrice: kz(26) },
      ],
      modifiers: [
        { group: "papel", choice: "texturado-300", type: "add_unit", value: kz(40) },
        { group: "impressao", choice: "frente-verso", type: "percent", value: 30 },
        { group: "acabamento", choice: "laminacao-mate", type: "add_unit", value: kz(15) },
        { group: "acabamento", choice: "soft-touch", type: "add_unit", value: kz(35) },
        { group: "acabamento", choice: "hot-stamping", type: "add_unit", value: kz(60) },
        { group: "acabamento", choice: "hot-stamping", type: "add_fixed", value: kz(15000) },
      ],
      urgentSurchargePct: 50,
      designFee: kz(15000),
    },
    minQty: 100,
    quantityPresets: [100, 250, 500, 1000, 2000],
    unit: "cartões",
    leadTime: { normalDays: 2, urgentDays: 1 },
    allowDesignService: true,
    fileRequirements: { formats: PRINT_FILES, minDpi: 300, bleedMm: 3, maxSizeMb: 100 },
    taxRate: 14,
  },
  {
    slug: "flyers",
    serviceSlug: "impressao-digital",
    name: "Flyers e folhetos",
    summary: "A6, A5 ou A4 em couché, a uma ou duas faces, prontos em 24 horas.",
    preview: "flat",
    image: { src: oficina, alt: "Provas impressas e cartões sobre a mesa de trabalho" },
    printSizeByOption: {
      group: "formato",
      sizes: { a6: { width: 10.5, height: 14.8 }, a5: { width: 14.8, height: 21 }, a4: { width: 21, height: 29.7 } },
    },
    optionGroups: [
      {
        key: "formato",
        label: "Formato",
        type: "select",
        choices: [
          { key: "a6", label: "A6 · 10,5 × 14,8 cm" },
          { key: "a5", label: "A5 · 14,8 × 21 cm", default: true },
          { key: "a4", label: "A4 · 21 × 29,7 cm" },
        ],
      },
      {
        key: "papel",
        label: "Papel",
        type: "select",
        choices: [
          { key: "couche-135", label: "Couché brilho 135 g", default: true },
          { key: "couche-170", label: "Couché mate 170 g" },
        ],
      },
      {
        key: "impressao",
        label: "Impressão",
        type: "select",
        choices: [
          { key: "frente", label: "Só frente", default: true },
          { key: "frente-verso", label: "Frente e verso" },
        ],
      },
    ],
    pricing: {
      model: "tiered_unit",
      tiers: [
        { minQty: 100, unitPrice: kz(150) },
        { minQty: 250, unitPrice: kz(110) },
        { minQty: 500, unitPrice: kz(80) },
        { minQty: 1000, unitPrice: kz(55) },
        { minQty: 2500, unitPrice: kz(40) },
      ],
      modifiers: [
        { group: "formato", choice: "a6", type: "percent", value: -40 },
        { group: "formato", choice: "a4", type: "percent", value: 70 },
        { group: "papel", choice: "couche-170", type: "percent", value: 15 },
        { group: "impressao", choice: "frente-verso", type: "percent", value: 35 },
      ],
      urgentSurchargePct: 50,
      designFee: kz(15000),
    },
    minQty: 100,
    quantityPresets: [100, 250, 500, 1000, 2500],
    unit: "flyers",
    leadTime: { normalDays: 1, urgentDays: 0 },
    allowDesignService: true,
    fileRequirements: { formats: PRINT_FILES, minDpi: 300, bleedMm: 3, maxSizeMb: 100 },
    taxRate: 14,
  },
  {
    slug: "roll-up",
    serviceSlug: "grande-formato",
    name: "Roll-up com estrutura",
    summary: "Impresso em lona sem reflexos, com estrutura de alumínio e saco de transporte.",
    preview: "rollup",
    image: { src: grandeFormato, alt: "Roll-up com o logo Endju ao lado de caixas kraft" },
    optionGroups: [
      {
        key: "tamanho",
        label: "Tamanho",
        type: "select",
        choices: [
          { key: "85x200", label: "85 × 200 cm", default: true },
          { key: "100x200", label: "100 × 200 cm" },
        ],
      },
      {
        key: "estrutura",
        label: "Estrutura",
        type: "select",
        choices: [
          { key: "standard", label: "Standard", default: true },
          { key: "premium", label: "Premium, base larga e mais estável" },
        ],
      },
    ],
    pricing: {
      model: "fixed",
      fixedPrice: kz(45000),
      modifiers: [
        { group: "tamanho", choice: "100x200", type: "add_unit", value: kz(8000) },
        { group: "estrutura", choice: "premium", type: "add_unit", value: kz(15000) },
      ],
      urgentSurchargePct: 50,
      designFee: kz(20000),
    },
    minQty: 1,
    quantityPresets: [1, 2, 5, 10],
    unit: "roll-ups",
    leadTime: { normalDays: 2, urgentDays: 1 },
    allowDesignService: true,
    fileRequirements: { formats: PRINT_FILES, minDpi: 150, bleedMm: 5, maxSizeMb: 200 },
    printSizeByOption: {
      group: "tamanho",
      sizes: { "85x200": { width: 85, height: 200 }, "100x200": { width: 100, height: 200 } },
    },
    taxRate: 14,
  },
  {
    slug: "lona",
    serviceSlug: "grande-formato",
    name: "Lona impressa",
    summary: "Para fachadas, outdoors e eventos, com ilhós incluídos. Até 3,2 m de largura sem emendas.",
    preview: "banner",
    image: { src: efaiOutdoor, alt: "Outdoor do Centro Médico Efai Saúde montado na estrada" },
    optionGroups: [
      {
        key: "medidas",
        label: "Medidas",
        type: "size",
        size: { minCm: 30, maxCm: 1200, stepCm: 10, defaultCm: { width: 300, height: 200 } },
      },
      {
        key: "material",
        label: "Material",
        type: "select",
        choices: [
          { key: "frontlit-440", label: "Lona frontlit 440 g", default: true },
          { key: "frontlit-510", label: "Lona frontlit 510 g, mais resistente" },
          { key: "microperfurada", label: "Lona microperfurada, para zonas com vento" },
          { key: "backlit", label: "Lona backlit, para caixas de luz" },
        ],
      },
      {
        key: "acabamento",
        label: "Acabamento",
        type: "select",
        choices: [
          { key: "ilhos", label: "Ilhós a cada 50 cm", default: true },
          { key: "bainha-ilhos", label: "Bainha soldada e ilhós" },
          { key: "sem", label: "Sem acabamento (para estrutura)" },
        ],
      },
    ],
    pricing: {
      model: "area_m2",
      pricePerM2: kz(8500),
      minAreaM2: 1,
      modifiers: [
        { group: "material", choice: "frontlit-510", type: "add_m2", value: kz(1500) },
        { group: "material", choice: "microperfurada", type: "add_m2", value: kz(3000) },
        { group: "material", choice: "backlit", type: "add_m2", value: kz(3500) },
        { group: "acabamento", choice: "bainha-ilhos", type: "add_m2", value: kz(600) },
      ],
      urgentSurchargePct: 50,
      designFee: kz(20000),
    },
    minQty: 1,
    quantityPresets: [1, 2, 5, 10],
    unit: "lonas",
    leadTime: { normalDays: 2, urgentDays: 1 },
    allowDesignService: true,
    fileRequirements: { formats: PRINT_FILES, minDpi: 100, bleedMm: 5, maxSizeMb: 200 },
    taxRate: 14,
  },
  {
    slug: "vinil-autocolante",
    serviceSlug: "grande-formato",
    name: "Vinil autocolante",
    summary: "Para montras, paredes e viaturas, em monomérico, polimérico ou microperfurado.",
    preview: "flat",
    image: { src: efaiViatura, alt: "Viatura da Efai Saúde envelopada com vinil impresso" },
    optionGroups: [
      {
        key: "medidas",
        label: "Medidas",
        type: "size",
        size: { minCm: 10, maxCm: 600, stepCm: 5, defaultCm: { width: 100, height: 60 } },
      },
      {
        key: "material",
        label: "Material",
        type: "select",
        choices: [
          { key: "monomerico", label: "Monomérico, para montras e paredes", default: true },
          { key: "polimerico", label: "Polimérico, para viaturas e curvas" },
          { key: "microperfurado", label: "Microperfurado, para vidros" },
        ],
      },
      {
        key: "corte",
        label: "Corte",
        type: "select",
        choices: [
          { key: "retangular", label: "Retangular", default: true },
          { key: "contorno", label: "Corte de contorno à forma" },
        ],
      },
      {
        key: "laminacao",
        label: "Proteção",
        type: "select",
        choices: [
          { key: "sem", label: "Sem laminação", default: true },
          { key: "laminado", label: "Laminação contra riscos e sol" },
        ],
      },
    ],
    pricing: {
      model: "area_m2",
      pricePerM2: kz(9500),
      minAreaM2: 0.5,
      modifiers: [
        { group: "material", choice: "polimerico", type: "add_m2", value: kz(3000) },
        { group: "material", choice: "microperfurado", type: "add_m2", value: kz(2500) },
        { group: "corte", choice: "contorno", type: "add_m2", value: kz(2000) },
        { group: "laminacao", choice: "laminado", type: "add_m2", value: kz(1500) },
      ],
      urgentSurchargePct: 50,
      designFee: kz(15000),
    },
    minQty: 1,
    quantityPresets: [1, 2, 5, 10, 20],
    unit: "peças",
    leadTime: { normalDays: 2, urgentDays: 1 },
    allowDesignService: true,
    fileRequirements: { formats: PRINT_FILES, minDpi: 150, bleedMm: 3, maxSizeMb: 200 },
    taxRate: 14,
  },
  {
    slug: "caixas-de-envio",
    serviceSlug: "embalagens",
    name: "Caixas de envio em kraft",
    summary: "Caixas com a tua marca para lojas online e ofertas, com protótipo antes da produção.",
    preview: "box",
    image: { src: grandeFormato, alt: "Caixas kraft impressas com o logo Endju, uma aberta" },
    // Arte da tampa; a altura da caixa entra só na pré-visualização
    printSizeByOption: {
      group: "tamanho",
      sizes: { p: { width: 20, height: 15 }, m: { width: 30, height: 22 }, g: { width: 40, height: 30 } },
    },
    optionGroups: [
      {
        key: "tamanho",
        label: "Tamanho",
        type: "select",
        choices: [
          { key: "p", label: "Pequena · 20 × 15 × 5 cm", default: true },
          { key: "m", label: "Média · 30 × 22 × 8 cm" },
          { key: "g", label: "Grande · 40 × 30 × 12 cm" },
        ],
      },
      {
        key: "impressao",
        label: "Impressão",
        type: "select",
        choices: [
          { key: "uma-cor", label: "Logótipo a 1 cor", default: true },
          { key: "cores", label: "A cores" },
        ],
      },
    ],
    pricing: {
      model: "tiered_unit",
      tiers: [
        { minQty: 100, unitPrice: kz(950) },
        { minQty: 250, unitPrice: kz(780) },
        { minQty: 500, unitPrice: kz(620) },
        { minQty: 1000, unitPrice: kz(480) },
      ],
      setupFee: kz(25000),
      modifiers: [
        { group: "tamanho", choice: "m", type: "percent", value: 35 },
        { group: "tamanho", choice: "g", type: "percent", value: 80 },
        { group: "impressao", choice: "cores", type: "percent", value: 40 },
      ],
      urgentSurchargePct: 30,
      designFee: kz(25000),
    },
    minQty: 100,
    quantityPresets: [100, 250, 500, 1000],
    unit: "caixas",
    leadTime: { normalDays: 8, urgentDays: 6 },
    allowDesignService: true,
    fileRequirements: { formats: PRINT_FILES, minDpi: 300, bleedMm: 3, maxSizeMb: 100 },
    taxRate: 14,
  },
  {
    slug: "coletes-refletores",
    serviceSlug: "fardamento",
    name: "Coletes refletores personalizados",
    summary: "Alta visibilidade com o logótipo da empresa, para obras, eventos, igrejas e equipas de rua.",
    preview: "vest",
    image: null,
    optionGroups: [
      {
        key: "cor",
        label: "Cor do colete",
        type: "select",
        choices: [
          { key: "amarelo", label: "Amarelo fluorescente", default: true },
          { key: "laranja", label: "Laranja fluorescente" },
        ],
      },
      {
        key: "personalizacao",
        label: "Personalização",
        type: "select",
        choices: [
          { key: "frente", label: "Logótipo à frente", default: true },
          { key: "frente-costas", label: "Logótipo à frente e nas costas" },
        ],
      },
    ],
    pricing: {
      model: "tiered_unit",
      tiers: [
        { minQty: 10, unitPrice: kz(6500) },
        { minQty: 50, unitPrice: kz(5200) },
        { minQty: 100, unitPrice: kz(4500) },
        { minQty: 250, unitPrice: kz(3900) },
      ],
      modifiers: [{ group: "personalizacao", choice: "frente-costas", type: "add_unit", value: kz(1500) }],
      urgentSurchargePct: 30,
      designFee: kz(10000),
    },
    minQty: 10,
    quantityPresets: [10, 50, 100, 250],
    unit: "coletes",
    leadTime: { normalDays: 5, urgentDays: 3 },
    allowDesignService: true,
    printSizeCm: { width: 10, height: 10 },
    fileRequirements: { formats: PRINT_FILES, minDpi: 300, bleedMm: 0, maxSizeMb: 50 },
    taxRate: 14,
  },
  {
    slug: "t-shirts-personalizadas",
    serviceSlug: "fardamento",
    name: "T-shirts personalizadas",
    summary: "Algodão com estampagem DTF a cores ou bordado, para equipas, eventos e campanhas.",
    preview: "photo",
    image: { src: tshirts, alt: "T-shirts estampadas acabadas de sair da impressora DTF" },
    printSizeCm: { width: 28, height: 35 },
    optionGroups: [
      {
        key: "tecnica",
        label: "Técnica",
        type: "select",
        choices: [
          { key: "dtf", label: "Estampagem DTF a cores", default: true },
          { key: "bordado", label: "Bordado no peito" },
        ],
      },
      {
        key: "peca",
        label: "Cor da peça",
        type: "select",
        choices: [
          { key: "branca", label: "Branca", default: true },
          { key: "cor", label: "Preta ou de cor" },
        ],
      },
      {
        key: "faces",
        label: "Personalização",
        type: "select",
        choices: [
          { key: "frente", label: "Só frente", default: true },
          { key: "frente-costas", label: "Frente e costas" },
        ],
      },
    ],
    pricing: {
      model: "tiered_unit",
      tiers: [
        { minQty: 10, unitPrice: kz(5500) },
        { minQty: 50, unitPrice: kz(4900) },
        { minQty: 100, unitPrice: kz(4500) },
      ],
      modifiers: [
        { group: "tecnica", choice: "bordado", type: "add_unit", value: kz(1500) },
        { group: "peca", choice: "cor", type: "add_unit", value: kz(500) },
        { group: "faces", choice: "frente-costas", type: "add_unit", value: kz(1800) },
      ],
      urgentSurchargePct: 30,
      designFee: kz(10000),
    },
    minQty: 10,
    quantityPresets: [10, 25, 50, 100],
    unit: "t-shirts",
    leadTime: { normalDays: 3, urgentDays: 1 },
    allowDesignService: true,
    fileRequirements: { formats: PRINT_FILES, minDpi: 300, bleedMm: 0, maxSizeMb: 50 },
    taxRate: 14,
  },
  {
    slug: "bones-bordados",
    serviceSlug: "brindes",
    name: "Bonés bordados",
    summary: "Snapback ou trucker com o logótipo bordado em relevo, a partir de 12 unidades.",
    preview: "photo",
    image: { src: bonesBordados, alt: "Bonés bordados em branco e vermelho expostos na loja" },
    optionGroups: [
      {
        key: "modelo",
        label: "Modelo",
        type: "select",
        choices: [
          { key: "snapback", label: "Snapback", default: true },
          { key: "trucker", label: "Trucker, com rede atrás" },
        ],
      },
      {
        key: "bordado",
        label: "Bordado",
        type: "select",
        choices: [
          { key: "frente", label: "Frente", default: true },
          { key: "frente-lateral", label: "Frente e lateral" },
        ],
      },
    ],
    pricing: {
      model: "tiered_unit",
      tiers: [
        { minQty: 12, unitPrice: kz(6500) },
        { minQty: 50, unitPrice: kz(5300) },
        { minQty: 100, unitPrice: kz(4600) },
        { minQty: 250, unitPrice: kz(4000) },
      ],
      setupFee: kz(10000),
      modifiers: [
        { group: "modelo", choice: "trucker", type: "add_unit", value: kz(500) },
        { group: "bordado", choice: "frente-lateral", type: "add_unit", value: kz(1200) },
      ],
      urgentSurchargePct: 30,
      designFee: kz(10000),
    },
    minQty: 12,
    quantityPresets: [12, 50, 100, 250],
    unit: "bonés",
    leadTime: { normalDays: 5, urgentDays: 3 },
    allowDesignService: true,
    printSizeCm: { width: 10, height: 6 },
    fileRequirements: { formats: PRINT_FILES, minDpi: 300, bleedMm: 0, maxSizeMb: 50 },
    taxRate: 14,
  },
];
