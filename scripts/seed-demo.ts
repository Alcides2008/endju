/**
 * DADOS DE DEMONSTRAÇÃO: enche o painel com clientes, pedidos em todos os estados, pagamentos, tarefas da oficina,
 * orçamentos, leads e despesas das últimas 8 semanas, para mostrar o sistema à Endju.
 * Tudo leva `demo: true` (e números EDJ-2026-9xxxx / ORC-2026-9xxxx, fora da numeração real) e sai com --limpar.
 * Correr de novo substitui a demonstração anterior.
 * Uso: npm run seed:demo        ·        npm run seed:demo -- --limpar
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { planTasks, routeFor } from "../src/lib/domain/production.ts";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
initializeApp(
  clientEmail && privateKey ? { credential: cert({ projectId, clientEmail, privateKey }), projectId } : { projectId },
);
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const COLLECTIONS = ["customers", "orders", "payments", "productionTasks", "quotes", "leads", "expenses"];

async function clean() {
  let removed = 0;
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).where("demo", "==", true).get();
    // recursiveDelete leva também itens e eventos dos pedidos
    for (const doc of snap.docs) await db.recursiveDelete(doc.ref);
    removed += snap.size;
  }
  return removed;
}

const removed = await clean();
if (process.argv.includes("--limpar")) {
  console.log(`Demonstração removida: ${removed} documentos.`);
  process.exit(0);
}

const DAY = 86_400_000;
const now = Date.now();
const ago = (days: number, hour = 10) => Timestamp.fromMillis(now - days * DAY - (now % DAY) + hour * 3_600_000);
const kz = (value: number) => value * 100; // cêntimos
const vat = (gross: number) => gross - Math.round((gross * 100) / 114);
const tokens = (...values: (string | undefined)[]) => [
  ...new Set(
    values
      .filter(Boolean)
      .flatMap((v) =>
        v!
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .split(/[\s·,-]+/),
      )
      .flatMap((word) => Array.from({ length: Math.min(word.length, 15) }, (_, i) => word.slice(0, i + 1)))
      .filter((t) => t.length > 1),
  ),
];

// Preços de referência da demonstração (com IVA): próximos dos do catálogo inicial
const PRODUCTS: Record<string, { name: string; unit: string; price: (qty: number) => number }> = {
  "cartoes-de-visita": { name: "Cartões de visita", unit: "cartões", price: (q) => kz(Math.round(q * 70)) },
  flyers: { name: "Flyers e folhetos", unit: "flyers", price: (q) => kz(Math.round(q * 85)) },
  "roll-up": { name: "Roll-up com estrutura", unit: "roll-ups", price: (q) => kz(q * 65_000) },
  lona: { name: "Lona impressa", unit: "lonas", price: (q) => kz(q * 27_000) },
  "vinil-autocolante": { name: "Vinil autocolante", unit: "peças", price: (q) => kz(q * 800) },
  "caixas-de-envio": { name: "Caixas de envio em kraft", unit: "caixas", price: (q) => kz(q * 900) },
  "coletes-refletores": { name: "Coletes refletores personalizados", unit: "coletes", price: (q) => kz(q * 3_500) },
  "t-shirts-personalizadas": { name: "T-shirts personalizadas", unit: "t-shirts", price: (q) => kz(q * 3_500) },
  "bones-bordados": { name: "Bonés bordados", unit: "bonés", price: (q) => kz(q * 3_500) },
};

const CUSTOMERS = [
  { name: "Restaurante Sabores do Mussulo", type: "empresa", nif: "5417283910", phone: "+244923418720" },
  { name: "Clínica Bem-Estar Talatona", type: "empresa", nif: "5401928374", phone: "+244912650338" },
  { name: "Colégio Estrelinhas do Kilamba", type: "empresa", nif: "5419938201", phone: "+244934120985" },
  { name: "Kwanza Obras e Construção", type: "empresa", nif: "5000384712", phone: "+244926774031" },
  { name: "Farmácia Mutamba Saúde", type: "empresa", nif: "5412093847", phone: "+244917305562" },
  { name: "Ana Paula Domingos", type: "particular", phone: "+244931882047" },
  { name: "Hélder Manuel Cassoma", type: "particular", phone: "+244944219376" },
  { name: "Clube Desportivo Estrela do Cazenga", type: "empresa", nif: "5419020011", phone: "+244925661490" },
] as const;

type Line = [slug: string, qty: number, urgent?: boolean];
// [cliente, dias atrás, estado, pago: 0 | "sinal" | "total", linhas, canal]
const ORDERS: [number, number, string, 0 | "sinal" | "total", Line[], "site" | "balcao" | "whatsapp"][] = [
  [3, 54, "entregue", "total", [["coletes-refletores", 80]], "balcao"],
  [
    0,
    47,
    "entregue",
    "total",
    [
      ["flyers", 2000],
      ["roll-up", 2],
    ],
    "site",
  ],
  [
    7,
    40,
    "entregue",
    "total",
    [
      ["t-shirts-personalizadas", 60],
      ["bones-bordados", 30],
    ],
    "whatsapp",
  ],
  [1, 33, "entregue", "total", [["cartoes-de-visita", 500]], "site"],
  [
    2,
    26,
    "pronto",
    "total",
    [
      ["lona", 3],
      ["vinil-autocolante", 40],
    ],
    "site",
  ],
  [4, 19, "pronto", "sinal", [["caixas-de-envio", 300]], "balcao"],
  [
    0,
    12,
    "em_producao",
    "sinal",
    [
      ["cartoes-de-visita", 1000, true],
      ["flyers", 1500],
    ],
    "site",
  ],
  [
    3,
    10,
    "em_producao",
    "sinal",
    [
      ["lona", 4],
      ["roll-up", 1],
    ],
    "whatsapp",
  ],
  [7, 8, "em_producao", "total", [["t-shirts-personalizadas", 120]], "site"],
  [5, 6, "em_aprovacao", "sinal", [["cartoes-de-visita", 200]], "site"],
  [
    2,
    5,
    "em_aprovacao",
    0,
    [
      ["vinil-autocolante", 25],
      ["flyers", 1000],
    ],
    "site",
  ],
  [6, 4, "em_design", "sinal", [["bones-bordados", 15]], "whatsapp"],
  [1, 2, "recebido", 0, [["roll-up", 3]], "site"],
  [4, 1, "recebido", 0, [["flyers", 5000, true]], "site"],
  [6, 15, "cancelado", 0, [["cartoes-de-visita", 100]], "site"],
];

const STATUS_PATH = ["recebido", "em_design", "em_aprovacao", "em_producao", "pronto", "entregue"];
const MESSAGES: Record<string, string> = {
  recebido: "Pedido recebido",
  em_design: "Arte em preparação pelo designer",
  em_aprovacao: "Prova enviada para aprovação",
  em_producao: "Sinal pago · em produção",
  pronto: "Pedido pronto para levantamento",
  entregue: "Pedido entregue",
  cancelado: "Pedido cancelado a pedido do cliente",
};

const customerRefs = CUSTOMERS.map(() => db.collection("customers").doc());
const stats = CUSTOMERS.map(() => ({
  ordersCount: 0,
  totalSpent: 0,
  balanceDue: 0,
  lastOrderAt: undefined as Timestamp | undefined,
}));
const batch = db.batch();
let writes = 0;
const set = (ref: FirebaseFirestore.DocumentReference, data: object) => {
  batch.set(ref, { ...data, demo: true });
  writes++;
};

for (const [i, [c, days, status, paid, lines, channel]] of ORDERS.entries()) {
  const customer = CUSTOMERS[c];
  const number = `EDJ-2026-${String(90001 + i)}`;
  const createdAt = ago(days, 9 + (i % 7));
  const orderRef = db.collection("orders").doc();
  const items = lines.map(([slug, quantity, urgent]) => {
    const product = PRODUCTS[slug];
    const lineTotal = Math.round(product.price(quantity) * (urgent ? 1.3 : 1));
    return { ref: orderRef.collection("items").doc(), slug, quantity, urgent: !!urgent, product, lineTotal };
  });
  const delivery = channel === "site" && i % 2 === 0 ? kz(2_500) : 0;
  const itemsTotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const total = itemsTotal + delivery;
  const tax = items.reduce((s, it) => s + vat(it.lineTotal), 0) + vat(delivery);
  const depositRequired = Math.round(total / 2);
  const paidAmount = paid === "total" ? total : paid === "sinal" ? depositRequired : 0;
  const past = status === "cancelado" ? ["recebido"] : STATUS_PATH.slice(0, STATUS_PATH.indexOf(status) + 1);
  const proofStatus = ["em_producao", "pronto", "entregue"].includes(status)
    ? "aprovada"
    : status === "em_aprovacao"
      ? "enviada"
      : "pendente";
  const dueAt = Timestamp.fromMillis(createdAt.toMillis() + (items.some((it) => it.urgent) ? 3 : 8) * DAY);

  set(orderRef, {
    number,
    customerId: customerRefs[c].id,
    userId: "demo",
    customer: {
      name: customer.name,
      nif: "nif" in customer ? customer.nif : undefined,
      phone: customer.phone,
      type: customer.type,
    },
    channel,
    status,
    paymentStatus: paidAmount === 0 ? "pendente" : paidAmount < total ? "parcial" : "pago",
    priority: items.some((it) => it.urgent) ? "urgente" : "normal",
    itemsSummary: { count: items.length, names: items.map((it) => it.product.name) },
    totals: {
      items: itemsTotal,
      discount: 0,
      delivery,
      total,
      tax,
      subtotal: total - tax,
      depositRequired,
      paid: paidAmount,
      due: total - paidAmount,
    },
    depositRequired,
    delivery: delivery
      ? {
          method: "entrega",
          zoneId: "luanda-centro",
          address: { line1: "Rua Rainha Ginga, 112", city: "Luanda" },
          fee: delivery,
        }
      : { method: "levantamento", pickupPointId: "loja", fee: 0 },
    dueAt,
    needsDesign: i % 3 === 0,
    revisionCount: status === "em_aprovacao" ? 1 : 0,
    ...(status === "cancelado" ? { cancelReason: "O cliente desistiu do evento." } : {}),
    ...(status === "em_producao" || status === "pronto" || status === "entregue"
      ? { productionStartedAt: ago(days - 2) }
      : {}),
    searchTokens: tokens(number, customer.name, customer.phone),
    createdAt,
    updatedAt: ago(Math.max(days - past.length, 0)),
  });

  for (const it of items) {
    set(it.ref, {
      productId: it.slug,
      name: it.product.name,
      options: [],
      quantity: it.quantity,
      urgent: it.urgent,
      design: i % 3 === 0 ? "endju_cria" : "tenho_arte",
      artworkFileIds: [],
      unitPrice: Math.round(it.lineTotal / it.quantity),
      lineSubtotal: it.lineTotal - vat(it.lineTotal),
      taxRate: 14,
      lineTax: vat(it.lineTotal),
      lineTotal: it.lineTotal,
      priceBreakdown: [{ label: `${it.quantity} ${it.product.unit}`, amount: it.lineTotal }],
      proofStatus,
      createdAt,
    });
  }

  past.forEach((step, n) =>
    set(orderRef.collection("events").doc(), {
      type: "status",
      visibility: "cliente",
      ...(n ? { from: past[n - 1] } : {}),
      to: step,
      message: MESSAGES[step],
      actorName: n ? "Equipa Endju" : customer.name,
      at: ago(Math.max(days - n * 2, 0), 11 + n),
    }),
  );
  if (status === "cancelado")
    set(orderRef.collection("events").doc(), {
      type: "status",
      visibility: "cliente",
      from: "recebido",
      to: "cancelado",
      message: MESSAGES.cancelado,
      actorName: "Equipa Endju",
      at: ago(days - 1),
    });

  // Pagamentos: o sinal primeiro; o resto, quando há, no levantamento
  const payments =
    paid === "total" && ["entregue", "pronto"].includes(status)
      ? [
          ["sinal", depositRequired, days - 1],
          ["restante", total - depositRequired, Math.max(days - 9, 0)],
        ]
      : paidAmount
        ? [[paid === "total" ? "total" : "sinal", paidAmount, days - 1]]
        : [];
  const methods = ["multicaixa_express", "transferencia", "referencia", "numerario"];
  for (const [n, [kind, amount, when]] of (payments as [string, number, number][]).entries()) {
    set(db.collection("payments").doc(), {
      orderId: orderRef.id,
      orderNumber: number,
      customerId: customerRefs[c].id,
      kind,
      method: methods[(i + n) % methods.length],
      amount,
      status: "confirmado",
      provider: { name: "manual" },
      confirmedBy: "demo",
      confirmedAt: ago(when, 15),
      createdAt: ago(when, 15),
      createdBy: "demo",
    });
  }

  // Oficina: tarefas pelo percurso de cada produto; nos pedidos em produção, a primeira já arrancou
  if (["em_producao", "pronto", "entregue"].includes(status)) {
    const tasks = planTasks(
      orderRef.id,
      items.map((it) => ({ id: it.ref.id, productId: it.slug })),
      routeFor,
    );
    for (const [n, task] of tasks.entries()) {
      const it = items.find((x) => x.ref.id === task.itemId)!;
      const done = status !== "em_producao" || n === 0;
      set(db.collection("productionTasks").doc(task.id), {
        orderId: orderRef.id,
        orderNumber: number,
        itemId: task.itemId,
        itemName: it.product.name,
        quantity: it.quantity,
        details: "",
        notes: null,
        customerName: customer.name,
        sector: task.sector,
        status: done ? "concluida" : n === 1 ? "em_curso" : "por_fazer",
        priority: it.urgent ? 3 : 2,
        dueAt,
        timeLogs: [],
        dependsOn: task.dependsOn,
        createdAt: ago(days - 2),
        ...(done ? { completedAt: ago(Math.max(days - 4, 0)) } : {}),
      });
    }
  }

  const s = stats[c];
  if (status !== "cancelado") {
    s.ordersCount++;
    s.totalSpent += paidAmount;
    s.balanceDue += total - paidAmount;
  }
  if (!s.lastOrderAt || s.lastOrderAt.toMillis() < createdAt.toMillis()) s.lastOrderAt = createdAt;
}

CUSTOMERS.forEach((customer, c) =>
  set(customerRefs[c], {
    type: customer.type,
    segment: customer.type,
    name: customer.name,
    nif: "nif" in customer ? customer.nif : undefined,
    phone: customer.phone,
    contacts: [],
    addresses: [],
    tags: ["demo"],
    userIds: [],
    paymentTerms: "sinal_50",
    stats: stats[c],
    searchTokens: tokens(customer.name, customer.phone, "nif" in customer ? customer.nif : undefined),
    createdAt: ago(60 - c * 3),
    updatedAt: ago(1),
  }),
);

const QUOTES = [
  [
    "Mariana Lopes",
    "+244923007781",
    "Kit de boas-vindas para 40 colaboradores: caderno, caneta e saco de pano com logótipo.",
    "250000-500000",
    3,
  ],
  [
    "Kwanza Obras e Construção",
    "+244926774031",
    "Sinalética de obra: 12 placas em PVC 60×40 e 2 painéis de 3×2 m.",
    "500000-1000000",
    6,
  ],
  [
    "Paulo Sebastião",
    "+244912884410",
    "Convites de casamento com envelope, 150 unidades, papel texturado.",
    "100000-250000",
    9,
  ],
  ["Clínica Bem-Estar Talatona", "+244912650338", "Fardas: 30 batas bordadas e 30 crachás.", "250000-500000", 13],
] as const;
QUOTES.forEach(([name, phone, description, budgetRange, days], i) => {
  const number = `ORC-2026-${90001 + i}`;
  set(db.collection("quotes").doc(), {
    number,
    kind: "personalizado",
    contact: { name, phone },
    request: { description, budgetRange, fileIds: [] },
    status: i === 0 ? "novo" : i === 1 ? "em_analise" : "novo",
    currentVersion: 0,
    searchTokens: tokens(number, name, phone),
    createdAt: ago(days),
    updatedAt: ago(days),
  });
});

const LEADS = [
  ["Mariana Lopes", "+244923007781", "orcamento", "Kit de boas-vindas", "proposta", 3],
  ["Paulo Sebastião", "+244912884410", "orcamento", "Convites de casamento", "contactado", 9],
  ["Joana Tchissola", "+244935120044", "contacto", "Grande formato", "novo", 1],
  ["Bento Kiala", "+244918332907", "whatsapp", "T-shirts para evento", "qualificado", 6],
  ["Loja Moda Nzinga", "+244927441180", "contacto", "Embalagens", "ganho", 20],
  ["Rui Cardoso", "+244944015523", "contacto", "Cartões de visita", "perdido", 30],
] as const;
for (const [name, phone, source, interest, stage, days] of LEADS)
  set(db.collection("leads").doc(), {
    name,
    phone,
    source,
    interest,
    message: `Pedido de informação: ${interest.toLowerCase()}.`,
    stage,
    consentAt: ago(days),
    searchTokens: tokens(name, phone),
    createdAt: ago(days),
    updatedAt: ago(Math.max(days - 1, 0)),
  });

const EXPENSES = [
  ["materia_prima", "Resmas de papel couché 300 g e tinta", 420_000, 50, "pago"],
  ["renda", "Renda da loja", 350_000, 28, "pago"],
  ["energia_gerador", "Gasóleo para o gerador", 95_000, 14, "pago"],
  ["materia_prima", "Rolo de lona 510 g (3,2 × 50 m)", 610_000, 7, "pendente"],
  ["internet_telecom", "Internet fibra", 45_000, 3, "pendente"],
] as const;
for (const [category, description, amount, days, status] of EXPENSES)
  set(db.collection("expenses").doc(), {
    category,
    description,
    supplierId: null,
    supplierName: null,
    amount: kz(amount),
    taxAmount: vat(kz(amount)),
    date: ago(days, 12),
    dueAt: ago(days - 2, 12),
    recurring: category === "renda" ? { every: "mes" } : null,
    status,
    ...(status === "pago" ? { paidAt: ago(days - 1, 12) } : {}),
    createdAt: ago(days),
    createdBy: "demo",
    updatedAt: ago(days),
  });

// Um só lote: o Firestore aceita até 500 escritas
if (writes > 500) throw new Error("Demasiadas escritas num lote: dividir o seed.");
await batch.commit();
console.log(
  `Demonstração criada: ${CUSTOMERS.length} clientes, ${ORDERS.length} pedidos, ${QUOTES.length} orçamentos, ${LEADS.length} leads, ${EXPENSES.length} despesas (${writes} documentos).` +
    (removed ? ` Substituiu ${removed} documentos da demonstração anterior.` : ""),
);
