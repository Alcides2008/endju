"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { cloudinaryConfigured, deliveryUrl, signedUpload } from "@/lib/cloudinary";
import type { OrderStatus } from "@/lib/domain/order-status";
import { adminDb } from "@/lib/firebase/admin";
import { emailCustomer } from "@/features/messages/server";
import { NO_PERMISSION, staffCan } from "./guard";
import { notifyUser } from "./notify";

/** Assinatura para o browser enviar a prova direto para o Cloudinary, numa pasta por pedido. */
export async function signProofUpload(orderId: string) {
  const user = await staffCan("proofs", "create");
  if (!user) return null;
  return signedUpload(`endju/provas/${orderId.replace(/[^\w-]/g, "")}`, { formats: "document" });
}

const MAX_INLINE = 700 * 1024;

const proofSchema = z.object({
  orderId: z.string().min(1).max(64),
  itemId: z.string().min(1).max(64),
  message: z.string().trim().max(1000),
  upload: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("cloudinary"),
      publicId: z.string().min(1).max(300),
      format: z.string().min(2).max(8),
      width: z.number().positive(),
      height: z.number().positive(),
      pages: z.number().int().positive().optional(),
    }),
    // shortcut: sem Cloudinary configurado, imagens pequenas ficam no próprio documento (como a prova de teste)
    z.object({
      kind: z.literal("inline"),
      dataUrl: z
        .string()
        .regex(/^data:image\/(png|jpeg|webp);base64,/)
        .max(MAX_INLINE * 1.4),
      width: z.number().positive(),
      height: z.number().positive(),
    }),
  ]),
});

export type ProofInput = z.input<typeof proofSchema>;

/**
 * Envia a prova vN de um item (docs/04 · Aprovação de prova): substitui a versão pendente, põe o item em
 * "enviada", o pedido em aprovação, regista o evento e avisa o cliente.
 */
export async function createProof(
  input: ProofInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const user = await staffCan("proofs", "create");
  if (!user) return NO_PERMISSION;
  const parsed = proofSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { orderId, itemId, message, upload } = parsed.data;
  if (upload.kind === "cloudinary" && !upload.publicId.startsWith(`endju/provas/${orderId}/`)) {
    return { ok: false, message: "Ficheiro fora da pasta deste pedido." };
  }
  if (upload.kind === "inline" && cloudinaryConfigured) return { ok: false, message: "Usa o envio pelo Cloudinary." };

  const preview =
    upload.kind === "cloudinary"
      ? {
          url: deliveryUrl(upload.publicId, upload.format, "w_2400,f_auto,q_auto"),
          publicId: upload.publicId,
          width: upload.width,
          height: upload.height,
          pages: upload.pages ?? 1,
        }
      : { url: upload.dataUrl, width: upload.width, height: upload.height, pages: 1 };

  const db = adminDb();
  const orderRef = db.collection("orders").doc(orderId);
  const itemRef = orderRef.collection("items").doc(itemId);
  const proofRef = db.collection("proofs").doc();
  try {
    const result = await db.runTransaction(async (tx) => {
      const [order, item, previous] = await Promise.all([
        tx.get(orderRef),
        tx.get(itemRef),
        tx.get(db.collection("proofs").where("orderId", "==", orderId).where("itemId", "==", itemId)),
      ]);
      if (!order.exists || !item.exists) throw new Error("Pedido ou produto não encontrado.");
      const status = order.get("status") as OrderStatus;
      if (["pronto", "entregue", "cancelado"].includes(status)) throw new Error("Este pedido já não aceita provas.");
      const version = previous.size + 1;
      const at = Timestamp.now();
      previous.docs
        .filter((p) => p.get("status") === "pendente")
        .forEach((p) => tx.update(p.ref, { status: "substituida", updatedAt: at }));
      tx.set(proofRef, {
        orderId,
        orderNumber: order.get("number"),
        itemId,
        itemName: item.get("name"),
        customerId: order.get("customerId"),
        userId: order.get("userId") ?? null,
        version,
        status: "pendente",
        originalFileId: upload.kind === "cloudinary" ? upload.publicId : "",
        preview,
        designerId: user.uid,
        message: message || undefined,
        sentAt: at,
        createdAt: at,
        updatedAt: at,
      });
      tx.update(itemRef, { proofStatus: "enviada", currentProofId: proofRef.id });
      const moves = status === "recebido" || status === "em_design";
      tx.update(orderRef, { ...(moves ? { status: "em_aprovacao" } : {}), updatedAt: at, updatedBy: user.uid });
      tx.set(orderRef.collection("events").doc(), {
        type: "proof",
        visibility: "cliente",
        from: status,
        to: moves ? "em_aprovacao" : status,
        message: `Prova v${version} de ${item.get("name")} enviada para aprovação`,
        actorId: user.uid,
        actorName: user.name ?? "Designer",
        at,
      });
      tx.set(db.collection("auditLogs").doc(), {
        actorId: user.uid,
        actorName: user.name ?? user.email ?? "Equipa",
        actorRole: user.role,
        action: "proof.sent",
        entity: { type: "proofs", id: proofRef.id, label: `${order.get("number")} v${version}` },
        at,
      });
      return {
        number: order.get("number") as string,
        userId: order.get("userId") as string | undefined,
        version,
        name: item.get("name") as string,
      };
    });
    if (result.userId) {
      await notifyUser(result.userId, {
        event: "prova.enviada",
        title: `Prova v${result.version} para aprovar`,
        body: `${result.name} · pedido ${result.number}`,
        link: `/conta/provas/${proofRef.id}`,
      });
    }
    await emailCustomer(orderId, "prova.enviada");
    revalidatePath(`/admin/pedidos/${result.number}`);
    revalidatePath("/admin/provas");
    return { ok: true, id: proofRef.id };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível enviar a prova." };
  }
}

export async function addStaffProofComment(
  proofId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await staffCan("proofs", "create");
  if (!user) return NO_PERMISSION;
  const text = body.trim();
  if (text.length < 2 || text.length > 1000) return { ok: false, message: "Escreve o comentário." };
  const ref = adminDb().collection("proofs").doc(proofId);
  const proof = await ref.get();
  if (!proof.exists) return { ok: false, message: "Prova não encontrada." };
  await ref.collection("comments").add({
    authorId: user.uid,
    authorName: user.name ?? "Equipa",
    authorKind: "equipa",
    body: text,
    page: 1,
    resolved: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  if (proof.get("userId")) {
    await notifyUser(proof.get("userId"), {
      event: "prova.enviada",
      title: "Resposta da Endju na tua prova",
      body: text.slice(0, 120),
      link: `/conta/provas/${proofId}`,
    });
  }
  revalidatePath(`/admin/provas/${proofId}`);
  return { ok: true };
}

export async function proofsBackend() {
  const user = await staffCan("proofs", "create");
  return user ? { cloudinary: cloudinaryConfigured, maxInlineKb: MAX_INLINE / 1024 } : null;
}
