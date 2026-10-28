import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type { MaterialCategory, PayableStatus, PurchaseOrderStatus } from "@/lib/domain/stock";
import { adminDb } from "@/lib/firebase/admin";

const date = (value: unknown) => (value as Timestamp | undefined | null)?.toDate() ?? null;

export type SupplierRow = {
  id: string;
  name: string;
  nif?: string;
  contact: { name: string; phone?: string; email?: string };
  categories: MaterialCategory[];
  paymentTermsDays: number;
  iban?: string;
  address?: string;
  rating?: number;
  notes?: string;
  active: boolean;
};

const toSupplier = (doc: FirebaseFirestore.DocumentSnapshot): SupplierRow => {
  const d = doc.data()!;
  return {
    id: doc.id,
    name: d.name,
    nif: d.nif ?? undefined,
    contact: d.contacts?.[0] ?? { name: "" },
    categories: d.categories ?? [],
    paymentTermsDays: d.paymentTermsDays ?? 0,
    iban: d.iban ?? undefined,
    address: d.address ?? undefined,
    rating: d.rating ?? undefined,
    notes: d.notes ?? undefined,
    active: d.active !== false,
  };
};

export async function listSuppliers() {
  const snap = await adminDb().collection("suppliers").get();
  return snap.docs.map(toSupplier).sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export type PurchaseLine = {
  materialId: string;
  description: string;
  qty: number;
  unitCost: number;
  receivedQty: number;
};

export type PurchaseOrderRow = {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  lines: PurchaseLine[];
  totals: { subtotal: number; tax: number; total: number };
  expectedAt: Date | null;
  notes?: string;
  createdAt: Date | null;
  approvedAt: Date | null;
  payable: { dueAt: Date | null; paid: number; status: PayableStatus };
  cancelReason?: string;
};

const toPurchaseOrder = (doc: FirebaseFirestore.DocumentSnapshot): PurchaseOrderRow => {
  const d = doc.data()!;
  return {
    id: doc.id,
    number: d.number,
    supplierId: d.supplierId,
    supplierName: d.supplierName,
    status: d.status,
    lines: d.lines ?? [],
    totals: d.totals,
    expectedAt: date(d.expectedAt),
    notes: d.notes ?? undefined,
    createdAt: date(d.createdAt),
    approvedAt: date(d.approvedAt),
    payable: { dueAt: date(d.payable?.dueAt), paid: d.payable?.paid ?? 0, status: d.payable?.status ?? "por_pagar" },
    cancelReason: d.cancel?.reason ?? undefined,
  };
};

/** shortcut: as 300 encomendas mais recentes; com mais histórico, paginar por createdAt. */
export async function listPurchaseOrders() {
  const snap = await adminDb().collection("purchaseOrders").orderBy("createdAt", "desc").limit(300).get();
  return snap.docs.map(toPurchaseOrder);
}

export async function getPurchaseOrder(id: string) {
  const doc = await adminDb().collection("purchaseOrders").doc(id).get();
  return doc.exists ? toPurchaseOrder(doc) : null;
}

/** Ficha do fornecedor com as encomendas (mais recentes primeiro) e os materiais que fornece. */
export async function getSupplier(id: string) {
  const db = adminDb();
  const [doc, orders, materials] = await Promise.all([
    db.collection("suppliers").doc(id).get(),
    db.collection("purchaseOrders").where("supplierId", "==", id).get(),
    db.collection("materials").where("supplierIds", "array-contains", id).get(),
  ]);
  if (!doc.exists) return null;
  return {
    ...toSupplier(doc),
    orders: orders.docs
      .map(toPurchaseOrder)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
    materials: materials.docs.map((m) => ({ id: m.id, name: m.get("name") as string, sku: m.get("sku") as string })),
  };
}
