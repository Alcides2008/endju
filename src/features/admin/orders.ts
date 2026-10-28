import "server-only";
import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import { ACTIVE_STATUSES, type OrderStatus, type PaymentStatus, type ProofStatus } from "@/lib/domain/order-status";
import { adminDb } from "@/lib/firebase/admin";

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

export type AdminOrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  priority: "normal" | "urgente";
  total: number;
  paid: number;
  due: number;
  itemsLabel: string;
  assigneeId?: string;
  createdAt: Date | null;
  dueAt: Date | null;
  late: boolean;
  awaitingDeposit: boolean;
};

export function toRow(id: string, d: DocumentData, now = new Date()): AdminOrderRow {
  const dueAt = date(d.dueAt);
  return {
    id,
    number: d.number,
    customerName: d.customer?.name ?? "",
    customerPhone: d.customer?.phone ?? "",
    status: d.status,
    paymentStatus: d.paymentStatus,
    priority: d.priority ?? "normal",
    total: d.totals?.total ?? 0,
    paid: d.totals?.paid ?? 0,
    due: d.totals?.due ?? 0,
    itemsLabel: (d.itemsSummary?.names ?? []).join(", "),
    assigneeId: d.assigneeId,
    createdAt: date(d.createdAt),
    dueAt,
    // "Atrasado" não é guardado: é estado ativo com prazo passado (docs/02)
    late: ACTIVE_STATUSES.includes(d.status) && !!dueAt && dueAt < now,
    awaitingDeposit: Boolean(d.awaitingDeposit),
  };
}

/** Pedidos em curso (Kanban e vista por omissão): `in` sem ordenação dispensa índices compostos. */
export async function listActiveOrders() {
  const snap = await adminDb().collection("orders").where("status", "in", ACTIVE_STATUSES).get();
  return snap.docs
    .map((doc) => toRow(doc.id, doc.data()))
    .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
}

/**
 * Lista da tabela. Com pesquisa usa os searchTokens; com estado filtra por igualdade; sem filtros, os mais recentes.
 * shortcut: os filtros por estado ordenam em memória até 500 pedidos; com mais histórico, criar índice (status, createdAt).
 */
export async function listOrders(filter: { status?: OrderStatus | "ativos"; q?: string; limit?: number }) {
  const db = adminDb().collection("orders");
  const limit = filter.limit ?? 200;
  let docs;
  if (filter.q) {
    const token = filter.q
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 20);
    docs = (await db.where("searchTokens", "array-contains", token).limit(limit).get()).docs;
  } else if (filter.status === "ativos") {
    docs = (await db.where("status", "in", ACTIVE_STATUSES).get()).docs;
  } else if (filter.status) {
    docs = (await db.where("status", "==", filter.status).limit(500).get()).docs;
  } else {
    docs = (await db.orderBy("createdAt", "desc").limit(limit).get()).docs;
  }
  return docs
    .map((doc) => toRow(doc.id, doc.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    .slice(0, limit);
}

export type StaffMember = { uid: string; name: string; role: string };

export async function listStaff(): Promise<StaffMember[]> {
  const snap = await adminDb().collection("users").where("kind", "==", "equipa").get();
  return snap.docs
    .filter((d) => d.get("active") !== false)
    .map((d) => ({ uid: d.id, name: d.get("displayName") ?? d.get("email") ?? "Equipa", role: d.get("roleId") }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export type AdminOrderItem = {
  id: string;
  productId: string;
  name: string;
  options: { label: string; choiceLabel: string }[];
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

export async function getAdminOrder(number: string) {
  const snap = await adminDb().collection("orders").where("number", "==", number).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const d = doc.data();
  const [items, events, payments, proofs] = await Promise.all([
    doc.ref.collection("items").get(),
    doc.ref.collection("events").get(),
    adminDb().collection("payments").where("orderId", "==", doc.id).get(),
    adminDb().collection("proofs").where("orderId", "==", doc.id).get(),
  ]);
  return {
    ...toRow(doc.id, d),
    customer: d.customer as { name: string; nif?: string; phone: string; email?: string; type: string },
    customerId: d.customerId as string,
    userId: d.userId as string | undefined,
    totals: d.totals as {
      items: number;
      discount: number;
      delivery: number;
      tax: number;
      subtotal: number;
      total: number;
      paid: number;
      due: number;
    },
    depositRequired: (d.depositRequired as number) ?? 0,
    coupon: d.coupon as { code: string; discount: number } | undefined,
    delivery: d.delivery as {
      method: "levantamento" | "entrega";
      fee: number;
      address?: {
        recipient: string;
        phone: string;
        street: string;
        neighborhood: string;
        municipality: string;
        province: string;
        reference?: string;
      };
    },
    customerNotes: d.customerNotes as string | undefined,
    revisionCount: (d.revisionCount as number) ?? 0,
    cancel: d.cancel ? { reason: d.cancel.reason as string, at: date(d.cancel.at) } : undefined,
    items: items.docs
      .map((item) => ({
        id: item.id,
        ...(item.data() as Omit<AdminOrderItem, "id">),
        createdAt: date(item.get("createdAt")),
      }))
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)),
    events: events.docs
      .map((e) => ({
        id: e.id,
        type: e.get("type") as string,
        visibility: e.get("visibility") as "cliente" | "interno",
        message: e.get("message") as string,
        actorName: (e.get("actorName") as string) ?? "",
        at: date(e.get("at")),
      }))
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)),
    payments: payments.docs
      .map((p) => ({
        id: p.id,
        kind: p.get("kind") as string,
        method: p.get("method") as string,
        amount: p.get("amount") as number,
        status: p.get("status") as string,
        reference: p.get("provider.reference") as string | undefined,
        confirmedAt: date(p.get("confirmedAt")),
      }))
      .sort((a, b) => (b.confirmedAt?.getTime() ?? 0) - (a.confirmedAt?.getTime() ?? 0)),
    proofs: proofs.docs.map((p) => ({
      id: p.id,
      itemId: p.get("itemId") as string,
      version: p.get("version") as number,
      status: p.get("status") as string,
    })),
  };
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;
