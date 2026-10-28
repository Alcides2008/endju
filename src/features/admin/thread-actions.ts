"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { NO_PERMISSION, staffCan } from "./guard";
import { notifyUser } from "./notify";

type Result = { ok: true } | { ok: false; message: string };

/** Resposta da equipa: o cliente vê-a em tempo real na conta e recebe aviso. */
export async function replyThread(threadId: string, body: string): Promise<Result> {
  const user = await staffCan("messaging", "create");
  if (!user) return NO_PERMISSION;
  const text = body.trim();
  if (text.length < 1 || text.length > 3000) return { ok: false, message: "Escreve a resposta." };
  const ref = adminDb().collection("threads").doc(threadId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: "Conversa não encontrada." };
  const at = Timestamp.now();
  const batch = adminDb().batch();
  batch.set(ref.collection("messages").doc(), {
    authorId: user.uid,
    authorName: user.name ?? "Equipa Endju",
    authorKind: "equipa",
    body: text,
    fileIds: [],
    createdAt: at,
  });
  batch.update(ref, {
    status: "aberta",
    lastMessageAt: at,
    unreadByCustomer: true,
    unreadByTeam: false,
    assigneeId: snap.get("assigneeId") ?? user.uid,
    updatedAt: at,
  });
  await batch.commit();
  await notifyUser(snap.get("userId"), {
    event: "mensagem.nova",
    title: `Resposta da Endju: ${snap.get("subject")}`,
    body: text.slice(0, 120),
    link: `/conta/mensagens/${threadId}`,
  });
  revalidatePath("/admin/mensagens");
  revalidatePath(`/admin/mensagens/${threadId}`);
  return { ok: true };
}

/** Fecha ou reabre a conversa; uma nova mensagem do cliente reabre-a sozinha. */
export async function setThreadStatus(threadId: string, status: "aberta" | "fechada"): Promise<Result> {
  const user = await staffCan("messaging", "edit");
  if (!user) return NO_PERMISSION;
  const ref = adminDb().collection("threads").doc(threadId);
  if (!(await ref.get()).exists) return { ok: false, message: "Conversa não encontrada." };
  await ref.update({ status, unreadByTeam: false, updatedAt: Timestamp.now() });
  revalidatePath("/admin/mensagens");
  revalidatePath(`/admin/mensagens/${threadId}`);
  return { ok: true };
}

/** Abrir a conversa marca-a como lida pela equipa. */
export async function markThreadReadByTeam(threadId: string) {
  const user = await staffCan("messaging", "view");
  if (!user) return;
  const ref = adminDb().collection("threads").doc(threadId);
  const snap = await ref.get();
  if (snap.exists && snap.get("unreadByTeam")) await ref.update({ unreadByTeam: false });
}
