import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toRow } from "./orders";

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

export type CustomerRow = {
  id: string;
  name: string;
  type: "particular" | "empresa";
  segment: "particular" | "empresa" | "vip";
  phone: string;
  email?: string;
  nif?: string;
  tags: string[];
  paymentTerms: "pronto" | "sinal_50" | "a_30_dias";
  createdAt: Date | null;
  hasAccount: boolean;
};

function toCustomer(id: string, d: FirebaseFirestore.DocumentData): CustomerRow {
  return {
    id,
    name: d.name,
    type: d.type ?? "particular",
    segment: d.segment ?? d.type ?? "particular",
    phone: d.phone ?? "",
    email: d.email,
    nif: d.nif,
    tags: d.tags ?? [],
    paymentTerms: d.paymentTerms ?? "sinal_50",
    createdAt: date(d.createdAt),
    hasAccount: (d.userIds ?? []).length > 0,
  };
}

/** shortcut: sem paginação além de `limit` (o volume de clientes de uma gráfica cabe); paginar com cursor se passar 5000. */
export async function listCustomers(filter: { q?: string; segment?: string; limit?: number }) {
  const col = adminDb().collection("customers");
  const limit = filter.limit ?? 300;
  let docs;
  if (filter.q) {
    const token = filter.q
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .split(/\s+/)[0]
      .slice(0, 20);
    docs = (await col.where("searchTokens", "array-contains", token).limit(limit).get()).docs;
  } else if (filter.segment) {
    docs = (await col.where("segment", "==", filter.segment).limit(limit).get()).docs;
  } else {
    docs = (await col.orderBy("createdAt", "desc").limit(limit).get()).docs;
  }
  return docs
    .map((doc) => toCustomer(doc.id, doc.data()))
    .filter((c) => !filter.segment || c.segment === filter.segment)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function getCustomer(id: string) {
  const ref = adminDb().collection("customers").doc(id);
  const [doc, notes, orders] = await Promise.all([
    ref.get(),
    ref.collection("notes").get(),
    adminDb().collection("orders").where("customerId", "==", id).get(),
  ]);
  if (!doc.exists) return null;
  const d = doc.data()!;
  const orderRows = orders.docs
    .map((o) => toRow(o.id, o.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  const live = orderRows.filter((o) => o.status !== "cancelado");
  return {
    ...toCustomer(doc.id, d),
    tradeName: d.tradeName as string | undefined,
    whatsapp: d.whatsapp as string | undefined,
    addresses: (d.addresses ?? []) as {
      id: string;
      label: string;
      street: string;
      neighborhood: string;
      municipality: string;
      province: string;
    }[],
    contacts: (d.contacts ?? []) as { name: string; role?: string; phone?: string; email?: string }[],
    // Calculado a partir dos pedidos: a ficha não guarda totais que podiam ficar desatualizados
    stats: {
      ordersCount: live.length,
      totalSpent: live.reduce((sum, o) => sum + o.paid, 0),
      balanceDue: live.reduce((sum, o) => sum + o.due, 0),
      lastOrderAt: live[0]?.createdAt ?? null,
    },
    orders: orderRows,
    notes: notes.docs
      .map((n) => ({
        id: n.id,
        body: n.get("body") as string,
        authorName: n.get("authorName") as string,
        pinned: Boolean(n.get("pinned")),
        at: date(n.get("createdAt")),
      }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)),
  };
}

export type AdminCustomer = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;
