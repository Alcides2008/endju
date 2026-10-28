import "server-only";
import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import type { OrderStatus, PaymentStatus, ProofStatus } from "@/lib/domain/order-status";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Leituras da área do cliente com o Admin SDK, sempre filtradas pelo utilizador da sessão.
 * Só filtros de igualdade e ordenação em memória: o volume por cliente é pequeno e evita índices compostos.
 */

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

export type OrderTotals = {
  items: number;
  discount: number;
  delivery: number;
  tax: number;
  subtotal: number;
  total: number;
  paid: number;
  due: number;
};

export type OrderSummary = {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totals: OrderTotals;
  depositRequired: number;
  itemsSummary: { count: number; names: string[] };
  createdAt: Date | null;
  dueAt: Date | null;
};

function toSummary(id: string, d: DocumentData): OrderSummary {
  return {
    id,
    number: d.number,
    status: d.status,
    paymentStatus: d.paymentStatus,
    totals: d.totals,
    depositRequired: d.depositRequired ?? 0,
    itemsSummary: d.itemsSummary ?? { count: 0, names: [] },
    createdAt: date(d.createdAt),
    dueAt: date(d.dueAt),
  };
}

const newestFirst = <T extends { createdAt: Date | null }>(a: T, b: T) =>
  (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);

export async function listMyOrders(uid: string) {
  const snap = await adminDb().collection("orders").where("userId", "==", uid).get();
  return snap.docs.map((doc) => toSummary(doc.id, doc.data())).sort(newestFirst);
}

export type OrderItemView = {
  id: string;
  productId: string;
  name: string;
  options: { group: string; label: string; choice: string; choiceLabel: string }[];
  size?: { widthCm: number; heightCm: number };
  quantity: number;
  urgent: boolean;
  design: "cliente_envia" | "endju_cria";
  notes?: string;
  lineTotal: number;
  proofStatus: ProofStatus;
  currentProofId?: string;
  artworkCheck?: { name: string; status: string; dpi?: number; messages: string[] };
};

export function getMyOrder(number: string, uid: string) {
  return getOrderView(number, uid);
}

/** Pedido como o cliente o vê. Com `uid`, só se for dele; sem `uid` (equipa, já autorizada), qualquer um. */
export async function getOrderView(number: string, uid?: string) {
  const snap = await adminDb().collection("orders").where("number", "==", number).limit(1).get();
  const doc = snap.docs[0];
  if (!doc || (uid !== undefined && doc.get("userId") !== uid)) return null;
  const d = doc.data();
  const [items, events] = await Promise.all([
    doc.ref.collection("items").get(),
    doc.ref.collection("events").where("visibility", "==", "cliente").get(),
  ]);
  return {
    ...toSummary(doc.id, d),
    priority: d.priority as "normal" | "urgente",
    delivery: d.delivery as {
      method: "levantamento" | "entrega";
      fee: number;
      address?: { recipient: string; street: string; neighborhood: string; municipality: string; province: string };
    },
    coupon: d.coupon as { code: string; discount: number } | undefined,
    revisionCount: (d.revisionCount as number) ?? 0,
    items: items.docs
      .map((item) => ({
        id: item.id,
        ...(item.data() as Omit<OrderItemView, "id">),
        createdAt: date(item.get("createdAt")),
      }))
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)),
    events: events.docs
      .map((event) => ({
        id: event.id,
        message: event.get("message") as string,
        to: event.get("to") as OrderStatus | undefined,
        at: date(event.get("at")),
      }))
      .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0)),
  };
}

export type ProofView = {
  id: string;
  orderId: string;
  orderNumber: string;
  itemId: string;
  itemName: string;
  version: number;
  status: "pendente" | "aprovada" | "alteracoes_pedidas" | "substituida";
  preview: { url: string; width: number; height: number; pages: number };
  message?: string;
  sentAt: Date | null;
  decision?: { byName: string; at: Date | null; termsVersion: string; note?: string };
};

function toProof(id: string, d: DocumentData): ProofView {
  return {
    id,
    orderId: d.orderId,
    orderNumber: d.orderNumber,
    itemId: d.itemId,
    itemName: d.itemName ?? "",
    version: d.version,
    status: d.status,
    preview: d.preview,
    message: d.message,
    sentAt: date(d.sentAt),
    decision: d.decision
      ? {
          byName: d.decision.byName,
          at: date(d.decision.at),
          termsVersion: d.decision.termsVersion,
          note: d.decision.note,
        }
      : undefined,
  };
}

export async function listMyProofs(uid: string) {
  const snap = await adminDb().collection("proofs").where("userId", "==", uid).get();
  return snap.docs
    .map((doc) => toProof(doc.id, doc.data()))
    .sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0));
}

export async function getMyProof(id: string, uid: string) {
  const doc = await adminDb().collection("proofs").doc(id).get();
  if (!doc.exists || doc.get("userId") !== uid) return null;
  return toProof(doc.id, doc.data()!);
}

export type QuoteView = {
  id: string;
  number: string;
  status: "novo" | "em_analise" | "enviado" | "aceite" | "recusado" | "expirado" | "convertido";
  description: string;
  quantity?: string;
  createdAt: Date | null;
  validUntil: Date | null;
  currentVersion: number;
};

export async function listMyQuotes(uid: string) {
  const snap = await adminDb().collection("quotes").where("userId", "==", uid).get();
  return snap.docs
    .map((doc): QuoteView => ({
      id: doc.id,
      number: doc.get("number"),
      status: doc.get("status"),
      description: doc.get("request.description"),
      quantity: doc.get("request.quantity"),
      createdAt: date(doc.get("createdAt")),
      validUntil: date(doc.get("validUntil")),
      currentVersion: doc.get("currentVersion") ?? 0,
    }))
    .sort(newestFirst);
}

export async function getMyQuote(id: string, uid: string) {
  const doc = await adminDb().collection("quotes").doc(id).get();
  if (!doc.exists || doc.get("userId") !== uid) return null;
  const versions = await doc.ref.collection("versions").get();
  const current = versions.docs.find((v) => v.get("version") === doc.get("currentVersion"));
  return {
    id: doc.id,
    number: doc.get("number") as string,
    status: doc.get("status") as QuoteView["status"],
    request: doc.get("request") as { description: string; quantity?: string; budgetRange?: string },
    createdAt: date(doc.get("createdAt")),
    validUntil: date(doc.get("validUntil")),
    version: current
      ? {
          number: current.get("version") as number,
          lines: current.get("lines") as { description: string; quantity: number; unitPrice: number }[],
          totals: current.get("totals") as { subtotal: number; discount: number; tax: number; total: number },
          terms: current.get("terms") as string,
          notes: current.get("notes") as string | undefined,
        }
      : null,
  };
}

export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  province: string;
  municipality: string;
  neighborhood: string;
  street: string;
  reference?: string;
  isDefault: boolean;
};

export async function getMyCustomer(uid: string) {
  const snap = await adminDb().collection("customers").where("userIds", "array-contains", uid).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  return {
    id: doc.id,
    type: doc.get("type") as "particular" | "empresa",
    name: doc.get("name") as string,
    nif: (doc.get("nif") as string | undefined) ?? "",
    addresses: (doc.get("addresses") as Address[] | undefined) ?? [],
  };
}

export type ThreadSummary = {
  id: string;
  subject: string;
  status: "aberta" | "fechada";
  lastMessageAt: Date | null;
  unread: boolean;
};

export async function listMyThreads(uid: string) {
  const snap = await adminDb().collection("threads").where("userId", "==", uid).get();
  return snap.docs
    .map((doc): ThreadSummary => ({
      id: doc.id,
      subject: doc.get("subject"),
      status: doc.get("status"),
      lastMessageAt: date(doc.get("lastMessageAt")),
      unread: Boolean(doc.get("unreadByCustomer")),
    }))
    .sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
}

export async function getMyThread(id: string, uid: string) {
  const doc = await adminDb().collection("threads").doc(id).get();
  if (!doc.exists || doc.get("userId") !== uid) return null;
  const messages = await doc.ref.collection("messages").get();
  return {
    id: doc.id,
    subject: doc.get("subject") as string,
    status: doc.get("status") as "aberta" | "fechada",
    orderNumber: doc.get("orderNumber") as string | undefined,
    messages: messages.docs
      .map((m) => ({
        id: m.id,
        authorKind: m.get("authorKind") as "cliente" | "equipa" | "sistema",
        authorName: m.get("authorName") as string,
        body: m.get("body") as string,
        at: date(m.get("createdAt")),
      }))
      .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0)),
  };
}

export async function getMyProfile(uid: string) {
  const doc = await adminDb().collection("users").doc(uid).get();
  return {
    displayName: (doc.get("displayName") as string | undefined) ?? "",
    phone: (doc.get("phone") as string | undefined) ?? "",
    notificationPrefs: (doc.get("notificationPrefs") as
      { email: boolean; whatsapp: boolean; marketing: boolean } | undefined) ?? {
      email: true,
      whatsapp: true,
      marketing: false,
    },
  };
}

export type ProofComment = {
  id: string;
  authorName: string;
  authorKind: "cliente" | "equipa";
  body: string;
  pin?: { x: number; y: number };
  at: Date | null;
};

export async function listProofComments(proofId: string): Promise<ProofComment[]> {
  const snap = await adminDb().collection("proofs").doc(proofId).collection("comments").get();
  return snap.docs
    .map((c) => ({
      id: c.id,
      authorName: c.get("authorName"),
      authorKind: c.get("authorKind"),
      body: c.get("body"),
      pin: c.get("pin"),
      at: date(c.get("createdAt")),
    }))
    .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
}

/** Ficheiros por pedido: o resultado da verificação feita no browser (sem upload até o Storage estar ativo). */
export async function listMyArtwork(uid: string) {
  const orders = await adminDb().collection("orders").where("userId", "==", uid).get();
  const rows = await Promise.all(
    orders.docs.map(async (order) => {
      const items = await order.ref.collection("items").get();
      return items.docs.map((item) => ({
        orderNumber: order.get("number") as string,
        orderCreatedAt: date(order.get("createdAt")),
        itemName: item.get("name") as string,
        design: item.get("design") as "cliente_envia" | "endju_cria",
        check: item.get("artworkCheck") as
          | {
              name: string;
              sizeBytes: number;
              status: "ok" | "avisos" | "por_verificar";
              dpi?: number;
              messages: string[];
            }
          | undefined,
      }));
    }),
  );
  return rows.flat().sort((a, b) => (b.orderCreatedAt?.getTime() ?? 0) - (a.orderCreatedAt?.getTime() ?? 0));
}
