import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type { MaterialCategory, MovementType, StockUnit } from "@/lib/domain/stock";
import { adminDb } from "@/lib/firebase/admin";

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

export type MaterialRow = {
  id: string;
  sku: string;
  name: string;
  category: MaterialCategory;
  unit: StockUnit;
  qty: number;
  minQty: number;
  isLow: boolean;
  avgCost: number;
  location?: string;
  supplierIds: string[];
  active: boolean;
};

const toMaterial = (doc: FirebaseFirestore.DocumentSnapshot): MaterialRow => {
  const d = doc.data()!;
  return {
    id: doc.id,
    sku: d.sku,
    name: d.name,
    category: d.category,
    unit: d.unit,
    qty: d.qty ?? 0,
    minQty: d.minQty ?? 0,
    isLow: Boolean(d.isLow),
    avgCost: d.avgCost ?? 0,
    location: d.location ?? undefined,
    supplierIds: d.supplierIds ?? [],
    active: d.active !== false,
  };
};

/** shortcut: lê todos os materiais (uma gráfica tem dezenas, não milhares); com mais, paginar por nome. */
export async function listMaterials() {
  const snap = await adminDb().collection("materials").get();
  return snap.docs.map(toMaterial).sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export type MovementRow = {
  id: string;
  materialId: string;
  materialName: string;
  unit: StockUnit;
  type: MovementType;
  qty: number;
  balanceAfter: number;
  unitCost?: number;
  reason: string;
  byName: string;
  orderNumber?: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  at: Date | null;
};

const toMovement = (doc: FirebaseFirestore.QueryDocumentSnapshot): MovementRow => ({
  id: doc.id,
  materialId: doc.get("materialId"),
  materialName: doc.get("materialName"),
  unit: doc.get("unit"),
  type: doc.get("type"),
  qty: doc.get("qty"),
  balanceAfter: doc.get("balanceAfter"),
  unitCost: doc.get("unitCost") ?? undefined,
  reason: doc.get("reason") ?? "",
  byName: doc.get("byName") ?? "",
  orderNumber: doc.get("orderNumber") ?? undefined,
  purchaseOrderId: doc.get("purchaseOrderId") ?? undefined,
  purchaseOrderNumber: doc.get("purchaseOrderNumber") ?? undefined,
  at: date(doc.get("at")),
});

/**
 * Ficha do material com os movimentos mais recentes.
 * shortcut: até 300 movimentos ordenados em memória; com mais histórico, índice (materialId, at) já previsto em docs/02.
 */
export async function getMaterial(id: string) {
  const db = adminDb();
  const [doc, moves] = await Promise.all([
    db.collection("materials").doc(id).get(),
    db.collection("stockMovements").where("materialId", "==", id).limit(300).get(),
  ]);
  if (!doc.exists) return null;
  return {
    ...toMaterial(doc),
    movements: moves.docs.map(toMovement).sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)),
  };
}

export async function listMovements(limit = 200) {
  const snap = await adminDb().collection("stockMovements").orderBy("at", "desc").limit(limit).get();
  return snap.docs.map(toMovement);
}
