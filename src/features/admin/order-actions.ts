"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import {
  ORDER_STATUS_META,
  ORDER_STATUSES,
  transitionError,
  type OrderStatus,
  type ProofStatus,
} from "@/lib/domain/order-status";
import { adminDb } from "@/lib/firebase/admin";
import { NO_PERMISSION, staffCan } from "./guard";
import { notifyUser } from "./notify";
import { emailCustomer } from "@/features/messages/server";
import { afterPayment, applyPayment } from "@/features/payments/server";
import { startProductionSafely } from "./production-start";

export type AdminResult = { ok: true } | { ok: false; message: string };

const actorName = (user: SessionUser) => user.name ?? user.email ?? "Equipa";

function audit(
  tx: FirebaseFirestore.Transaction,
  user: SessionUser,
  action: string,
  id: string,
  label: string,
  before?: object,
  after?: object,
) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action,
    entity: { type: "orders", id, label },
    before,
    after,
    at: Timestamp.now(),
  });
}

function refresh(number?: string) {
  revalidatePath("/admin/pedidos");
  if (number) revalidatePath(`/admin/pedidos/${number}`);
}

/**
 * Muda o estado com as guardas da máquina de estados (docs/04). O cliente vê o evento na linha do tempo
 * e recebe aviso no painel da conta.
 */
async function changeStatus(user: SessionUser, orderId: string, to: OrderStatus, reason?: string) {
  const db = adminDb();
  const ref = db.collection("orders").doc(orderId);
  const result = await db.runTransaction(async (tx) => {
    const [order, items, tasks] = await Promise.all([
      tx.get(ref),
      tx.get(ref.collection("items")),
      to === "cancelado" ? tx.get(db.collection("productionTasks").where("orderId", "==", orderId)) : null,
    ]);
    if (!order.exists) throw new Error("Pedido não encontrado.");
    const from = order.get("status") as OrderStatus;
    const error = transitionError(from, to, {
      isAdmin: user.role === "admin",
      itemProofs: items.docs.map((i) => i.get("proofStatus") as ProofStatus),
      paid: order.get("totals.paid") ?? 0,
      total: order.get("totals.total") ?? 0,
      depositRequired: order.get("depositRequired") ?? 0,
      reason,
    });
    if (error) throw new Error(error);
    const at = Timestamp.now();
    tx.update(ref, {
      status: to,
      awaitingDeposit: false,
      ...(to === "cancelado" ? { cancel: { reason: reason?.trim(), by: user.uid, at } } : {}),
      ...(to === "entregue" ? { "delivery.deliveredAt": at } : {}),
      updatedAt: at,
      updatedBy: user.uid,
    });
    tx.set(ref.collection("events").doc(), {
      type: "status",
      visibility: "cliente",
      from,
      to,
      message: to === "cancelado" ? `Pedido cancelado: ${reason?.trim()}` : ORDER_STATUS_META[to].label,
      actorId: user.uid,
      actorName: actorName(user),
      at,
    });
    // Pedido cancelado sai das filas da oficina; o que já foi feito fica no histórico
    tasks?.docs.filter((t) => t.get("status") !== "concluida").forEach((t) => tx.delete(t.ref));
    audit(tx, user, "order.status_changed", ref.id, order.get("number"), { status: from }, { status: to });
    return { number: order.get("number") as string, userId: order.get("userId") as string | undefined };
  });
  if (to === "em_producao") await startProductionSafely(orderId, user.uid);
  if (to === "pronto") await emailCustomer(orderId, "pedido.pronto");
  if (result.userId) {
    await notifyUser(result.userId, {
      event: "pedido.estado",
      title: `Pedido ${result.number}: ${ORDER_STATUS_META[to].label}`,
      body:
        to === "pronto"
          ? "O teu pedido está pronto."
          : `O estado do pedido mudou para ${ORDER_STATUS_META[to].label.toLowerCase()}.`,
      link: `/conta/pedidos/${result.number}`,
    });
  }
  return result.number;
}

export async function changeOrderStatus(orderId: string, to: string, reason?: string): Promise<AdminResult> {
  const user = await staffCan("orders", "edit");
  if (!user) return NO_PERMISSION;
  if (!(ORDER_STATUSES as readonly string[]).includes(to)) return { ok: false, message: "Estado inválido." };
  try {
    const number = await changeStatus(user, orderId, to as OrderStatus, reason);
    refresh(number);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível mudar o estado." };
  }
}

/** Ações em massa: aplica pedido a pedido e diz quantos falharam e porquê. */
export async function bulkChangeStatus(orderIds: string[], to: string): Promise<{ ok: number; failed: string[] }> {
  const user = await staffCan("orders", "edit");
  if (!user || !(ORDER_STATUSES as readonly string[]).includes(to) || to === "cancelado") {
    return { ok: 0, failed: [user ? "Estado inválido para ação em massa." : NO_PERMISSION.message] };
  }
  let ok = 0;
  const failed: string[] = [];
  for (const id of orderIds.slice(0, 100)) {
    try {
      await changeStatus(user, id, to as OrderStatus);
      ok++;
    } catch (error) {
      failed.push(error instanceof Error ? error.message : id);
    }
  }
  refresh();
  return { ok, failed };
}

export async function assignOrder(orderId: string, assigneeId: string): Promise<AdminResult> {
  const user = await staffCan("orders", "edit");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const ref = db.collection("orders").doc(orderId);
  const assignee = assigneeId ? await db.collection("users").doc(assigneeId).get() : null;
  if (assigneeId && (!assignee?.exists || assignee.get("kind") !== "equipa"))
    return { ok: false, message: "Pessoa inválida." };
  const number = await db.runTransaction(async (tx) => {
    const order = await tx.get(ref);
    if (!order.exists) throw new Error("Pedido não encontrado.");
    const at = Timestamp.now();
    tx.update(ref, { assigneeId: assigneeId || null, updatedAt: at, updatedBy: user.uid });
    tx.set(ref.collection("events").doc(), {
      type: "assignment",
      visibility: "interno",
      message: assigneeId ? `Atribuído a ${assignee?.get("displayName")}` : "Sem responsável",
      actorId: user.uid,
      actorName: actorName(user),
      at,
    });
    audit(
      tx,
      user,
      "order.assigned",
      ref.id,
      order.get("number"),
      { assigneeId: order.get("assigneeId") ?? null },
      { assigneeId },
    );
    return order.get("number") as string;
  });
  if (assigneeId && assigneeId !== user.uid) {
    await notifyUser(assigneeId, {
      event: "tarefa.atribuida",
      title: `Pedido ${number} atribuído a ti`,
      body: `Por ${actorName(user)}.`,
      link: `/admin/pedidos/${number}`,
    });
  }
  refresh(number);
  return { ok: true };
}

export async function setOrderDueDate(orderId: string, isoDate: string): Promise<AdminResult> {
  const user = await staffCan("orders", "edit");
  if (!user) return NO_PERMISSION;
  if (!z.iso.date().safeParse(isoDate).success) return { ok: false, message: "Data inválida." };
  const ref = adminDb().collection("orders").doc(orderId);
  const number = await adminDb().runTransaction(async (tx) => {
    const order = await tx.get(ref);
    if (!order.exists) throw new Error("Pedido não encontrado.");
    const dueAt = Timestamp.fromDate(new Date(`${isoDate}T17:00:00+01:00`));
    tx.update(ref, { dueAt, updatedAt: Timestamp.now(), updatedBy: user.uid });
    audit(tx, user, "order.due_changed", ref.id, order.get("number"), { dueAt: order.get("dueAt") }, { dueAt });
    return order.get("number") as string;
  });
  refresh(number);
  return { ok: true };
}

export async function addInternalNote(orderId: string, text: string, visibleToCustomer: boolean): Promise<AdminResult> {
  const user = await staffCan("orders", "edit");
  if (!user) return NO_PERMISSION;
  const message = text.trim();
  if (message.length < 2 || message.length > 2000) return { ok: false, message: "Escreve a nota." };
  const ref = adminDb().collection("orders").doc(orderId);
  const order = await ref.get();
  if (!order.exists) return { ok: false, message: "Pedido não encontrado." };
  await ref.collection("events").add({
    type: "note",
    visibility: visibleToCustomer ? "cliente" : "interno",
    message,
    actorId: user.uid,
    actorName: actorName(user),
    at: Timestamp.now(),
  });
  refresh(order.get("number"));
  return { ok: true };
}

const paymentSchema = z.object({
  amount: z.number().int().positive("Indica o valor."),
  method: z.enum(["numerario", "tpa", "transferencia", "multicaixa_express", "referencia"]),
  kind: z.enum(["sinal", "restante", "total"]),
  reference: z.string().trim().max(80),
});

/**
 * Pagamento registado pela equipa (balcão, TPA, transferência confirmada). As contas do pedido são as mesmas
 * da confirmação automática (applyPayment): totais e, com o sinal pago e as provas aprovadas, produção.
 */
export async function registerPayment(orderId: string, input: z.input<typeof paymentSchema>): Promise<AdminResult> {
  const user = (await staffCan("finance", "create")) ?? (await staffCan("orders", "create"));
  if (!user) return NO_PERMISSION;
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const db = adminDb();
  const ref = db.collection("orders").doc(orderId);
  try {
    const result = await db.runTransaction(async (tx) => {
      const [order, items] = await Promise.all([tx.get(ref), tx.get(ref.collection("items"))]);
      if (!order.exists) throw new Error("Pedido não encontrado.");
      const at = Timestamp.now();
      const paymentRef = db.collection("payments").doc();
      tx.set(paymentRef, {
        orderId: ref.id,
        orderNumber: order.get("number"),
        customerId: order.get("customerId"),
        kind: parsed.data.kind,
        method: parsed.data.method,
        amount: parsed.data.amount,
        status: "confirmado",
        provider: parsed.data.reference ? { name: "manual", reference: parsed.data.reference } : { name: "manual" },
        confirmedBy: user.uid,
        confirmedAt: at,
        createdAt: at,
        createdBy: user.uid,
      });
      const { paidBefore, paid, toProduction } = applyPayment(tx, order, items, parsed.data.amount, {
        uid: user.uid,
        name: actorName(user),
      });
      audit(
        tx,
        user,
        "payment.registered",
        ref.id,
        order.get("number"),
        { paid: paidBefore },
        { paid, method: parsed.data.method },
      );
      return { number: order.get("number") as string, toProduction };
    });
    await afterPayment({ id: orderId, number: result.number }, parsed.data.amount, result.toProduction, user.uid);
    refresh(result.number);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível registar." };
  }
}
