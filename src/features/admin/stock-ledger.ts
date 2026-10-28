import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import type { SessionUser } from "@/lib/auth/session";
import { applyMovement, formatQty, type MovementType, type StockUnit } from "@/lib/domain/stock";
import { adminDb } from "@/lib/firebase/admin";
import { AUDIENCE, notifyRoles } from "./notify";

export type MovementLinks = {
  orderId?: string;
  orderNumber?: string;
  productionTaskId?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  inventoryCountId?: string;
};

export type LowStock = { id: string; name: string; qty: number; minQty: number; unit: StockUnit };

/**
 * Movimento de stock dentro da transação de quem o causa (docs/02 · stockMovements): o saldo do material e o
 * movimento ficam sempre certos um com o outro. Chamar depois de todas as leituras da transação.
 * Devolve o material se acabou de ficar abaixo do mínimo, para avisar o Gestor depois da transação.
 */
export function moveStock(
  tx: FirebaseFirestore.Transaction,
  material: FirebaseFirestore.DocumentSnapshot,
  user: Pick<SessionUser, "uid" | "name" | "email">,
  move: { type: MovementType; delta: number; unitCost?: number; reason: string } & MovementLinks,
): LowStock | null {
  const before = {
    qty: material.get("qty") ?? 0,
    avgCost: material.get("avgCost") ?? 0,
    minQty: material.get("minQty") ?? 0,
  };
  const after = applyMovement(before, move.delta, move.unitCost);
  const unit = material.get("unit") as StockUnit;
  if (!after) throw new Error(`Só há ${formatQty(before.qty, unit)} de ${material.get("name")}.`);
  const at = Timestamp.now();
  const { type, delta, unitCost, reason, ...links } = move;
  tx.set(adminDb().collection("stockMovements").doc(), {
    materialId: material.id,
    materialName: material.get("name"),
    unit,
    type,
    qty: delta,
    balanceAfter: after.qty,
    ...(unitCost !== undefined ? { unitCost } : {}),
    ...links,
    reason,
    by: user.uid,
    byName: user.name ?? user.email ?? "Equipa",
    at,
  });
  tx.update(material.ref, { qty: after.qty, avgCost: after.avgCost, isLow: after.isLow, updatedAt: at });
  return after.isLow && !material.get("isLow")
    ? { id: material.id, name: material.get("name"), qty: after.qty, minQty: before.minQty, unit }
    : null;
}

export async function warnLowStock(items: (LowStock | null)[]) {
  for (const item of items) {
    if (!item) continue;
    await notifyRoles(AUDIENCE.managers, {
      event: "stock.baixo",
      title: `Stock baixo: ${item.name}`,
      body: `Restam ${formatQty(item.qty, item.unit)} (mínimo ${formatQty(item.minQty, item.unit)}).`,
      link: `/admin/stock/${item.id}`,
    });
  }
}
