"use server";

import { getSession } from "@/lib/auth/session";
import { can, isStaff, type Module } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";

export type SearchResult = { type: string; label: string; sub: string; href: string };

const SOURCES: {
  collection: string;
  module: Module;
  type: string;
  label: (d: FirebaseFirestore.DocumentData) => string;
  sub: (d: FirebaseFirestore.DocumentData) => string;
  href: (id: string, d: FirebaseFirestore.DocumentData) => string;
}[] = [
  {
    collection: "orders",
    module: "orders",
    type: "Pedido",
    label: (d) => d.number,
    sub: (d) => `${d.customer?.name ?? ""} · ${d.itemsSummary?.names?.join(", ") ?? ""}`,
    href: (_, d) => `/admin/pedidos/${d.number}`,
  },
  {
    collection: "customers",
    module: "customers",
    type: "Cliente",
    label: (d) => d.name,
    sub: (d) => [d.phone, d.email, d.nif].filter(Boolean).join(" · "),
    href: (id) => `/admin/clientes/${id}`,
  },
  {
    collection: "quotes",
    module: "quotes",
    type: "Orçamento",
    label: (d) => d.number,
    sub: (d) => d.contact?.name ?? "",
    href: (id) => `/admin/orcamentos/${id}`,
  },
];

/**
 * Pesquisa global do Ctrl+K: prefixo da primeira palavra em `searchTokens` (decisão 8 do plano),
 * só nos módulos que o papel pode ver.
 */
export async function adminSearch(query: string): Promise<SearchResult[]> {
  const user = await getSession();
  if (!user || !isStaff(user.role)) return [];
  const token = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .split(/\s+/)[0]
    ?.slice(0, 20);
  if (!token || token.length < 2) return [];

  const sources = SOURCES.filter((s) => can(user, s.module, "view"));
  const results = await Promise.all(
    sources.map(async (source) => {
      const snap = await adminDb()
        .collection(source.collection)
        .where("searchTokens", "array-contains", token)
        .limit(6)
        .get();
      return snap.docs.map((doc) => {
        const d = doc.data();
        return { type: source.type, label: source.label(d), sub: source.sub(d), href: source.href(doc.id, d) };
      });
    }),
  );
  return results.flat();
}

/** Marca notificações do próprio utilizador como lidas. */
export async function markNotificationsRead(ids: string[]) {
  const user = await getSession();
  if (!user || !isStaff(user.role) || ids.length === 0) return;
  const db = adminDb();
  const snaps = await db.getAll(...ids.slice(0, 100).map((id) => db.collection("notifications").doc(id)));
  const batch = db.batch();
  for (const snap of snaps)
    if (snap.exists && snap.get("recipientId") === user.uid) batch.update(snap.ref, { read: true });
  await batch.commit();
}

/** Papel e permissões da sessão, para o menu do painel mostrar só os módulos com acesso. */
export async function myAccess() {
  const user = await getSession();
  return user && isStaff(user.role) ? { role: user.role, perms: user.perms } : null;
}
