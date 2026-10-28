import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { ACTIVE_STATUSES } from "@/lib/domain/order-status";
import { adminDb } from "@/lib/firebase/admin";

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

export type AdminProofRow = {
  id: string;
  orderNumber: string;
  itemName: string;
  version: number;
  status: "pendente" | "aprovada" | "alteracoes_pedidas" | "substituida";
  sentAt: Date | null;
  previewUrl: string;
};

export async function listProofs(status?: string) {
  const col = adminDb().collection("proofs");
  const snap = await (
    status ? col.where("status", "==", status).limit(300) : col.orderBy("sentAt", "desc").limit(100)
  ).get();
  return snap.docs
    .map((d): AdminProofRow => ({
      id: d.id,
      orderNumber: d.get("orderNumber"),
      itemName: d.get("itemName") ?? "",
      version: d.get("version"),
      status: d.get("status"),
      sentAt: date(d.get("sentAt")),
      previewUrl: d.get("preview.url"),
    }))
    .sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0));
}

/**
 * Produtos de pedidos em curso que ainda precisam de prova (nunca enviada ou com alterações pedidas).
 * shortcut: lê os itens de cada pedido ativo; com centenas de pedidos ativos, usar collectionGroup('items')
 * com índice de grupo em proofStatus.
 */
export async function listProofQueue() {
  const orders = await adminDb().collection("orders").where("status", "in", ACTIVE_STATUSES).get();
  const rows = await Promise.all(
    orders.docs.map(async (order) => {
      const items = await order.ref.collection("items").where("proofStatus", "in", ["pendente", "alteracoes"]).get();
      return items.docs.map((item) => ({
        orderNumber: order.get("number") as string,
        customerName: order.get("customer.name") as string,
        dueAt: date(order.get("dueAt")),
        itemId: item.id,
        itemName: item.get("name") as string,
        status: item.get("proofStatus") as "pendente" | "alteracoes",
        design: item.get("design") as "cliente_envia" | "endju_cria",
      }));
    }),
  );
  return rows.flat().sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
}

export async function getAdminProof(id: string) {
  const doc = await adminDb().collection("proofs").doc(id).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    id: doc.id,
    orderId: d.orderId as string,
    orderNumber: d.orderNumber as string,
    itemId: d.itemId as string,
    itemName: (d.itemName as string) ?? "",
    version: d.version as number,
    status: d.status as AdminProofRow["status"],
    preview: d.preview as { url: string; width: number; height: number; pages: number },
    message: d.message as string | undefined,
    sentAt: date(d.sentAt),
    decision: d.decision
      ? {
          byName: d.decision.byName as string,
          at: date(d.decision.at),
          ip: d.decision.ip as string,
          termsVersion: d.decision.termsVersion as string,
          note: d.decision.note as string | undefined,
        }
      : undefined,
  };
}
