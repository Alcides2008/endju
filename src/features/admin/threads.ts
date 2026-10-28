import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

export type AdminThreadRow = {
  id: string;
  subject: string;
  customerName: string;
  orderNumber?: string;
  status: "aberta" | "fechada";
  unread: boolean;
  lastMessageAt: Date | null;
};

/** Caixa de suporte: conversas abertas (ou fechadas), as por ler primeiro. */
export async function listThreads(status: "aberta" | "fechada") {
  const snap = await adminDb().collection("threads").where("status", "==", status).limit(300).get();
  return snap.docs
    .map((d): AdminThreadRow => ({
      id: d.id,
      subject: d.get("subject"),
      customerName: d.get("customerName") ?? "Cliente",
      orderNumber: d.get("orderNumber"),
      status: d.get("status"),
      unread: Boolean(d.get("unreadByTeam")),
      lastMessageAt: date(d.get("lastMessageAt")),
    }))
    .sort(
      (a, b) =>
        Number(b.unread) - Number(a.unread) || (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0),
    );
}

export async function getAdminThread(id: string) {
  const doc = await adminDb().collection("threads").doc(id).get();
  if (!doc.exists) return null;
  const messages = await doc.ref.collection("messages").get();
  return {
    id: doc.id,
    subject: doc.get("subject") as string,
    customerName: (doc.get("customerName") as string) ?? "Cliente",
    userId: doc.get("userId") as string,
    status: doc.get("status") as "aberta" | "fechada",
    unread: Boolean(doc.get("unreadByTeam")),
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
