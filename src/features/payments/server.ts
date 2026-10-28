import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { startProductionSafely } from "@/features/admin/production-start";
import { notifyCustomer } from "@/features/messages/server";
import { formatKz } from "@/lib/domain/money";
import { paymentStatusFor, statusAfterApproval, type OrderStatus, type ProofStatus } from "@/lib/domain/order-status";
import { adminDb } from "@/lib/firebase/admin";

type Tx = FirebaseFirestore.Transaction;
type Snap = FirebaseFirestore.DocumentSnapshot;

/**
 * Soma um pagamento ao pedido dentro da transação de quem o confirma (equipa, webhook ou validação de
 * comprovativo): totais, estado do pagamento e, com o sinal pago e as provas aprovadas, entrada em produção.
 * Chamar depois das leituras. Devolve o que é preciso fazer depois da transação.
 */
export function applyPayment(
  tx: Tx,
  order: Snap,
  items: FirebaseFirestore.QuerySnapshot,
  amount: number,
  actor: { uid?: string; name: string },
) {
  if (order.get("status") === "cancelado") throw new Error("O pedido está cancelado.");
  const total = order.get("totals.total") as number;
  const paidBefore = (order.get("totals.paid") as number) ?? 0;
  if (paidBefore + amount > total) throw new Error(`O valor passa o total em falta (${formatKz(total - paidBefore)}).`);
  const paid = paidBefore + amount;
  const at = Timestamp.now();
  const status = order.get("status") as OrderStatus;
  // Provas aprovadas à espera do sinal: com o sinal pago, entra em produção
  const next =
    status === "em_aprovacao"
      ? statusAfterApproval({
          itemProofs: items.docs.map((i) => i.get("proofStatus") as ProofStatus),
          paid,
          depositRequired: order.get("depositRequired") ?? 0,
        })
      : null;
  tx.update(order.ref, {
    "totals.paid": paid,
    "totals.due": total - paid,
    paymentStatus: paymentStatusFor(paid, total),
    ...(next ? { status: next.status, awaitingDeposit: next.waitingDeposit } : {}),
    updatedAt: at,
    ...(actor.uid ? { updatedBy: actor.uid } : {}),
  });
  tx.set(order.ref.collection("events").doc(), {
    type: "payment",
    visibility: "cliente",
    message: `Pagamento de ${formatKz(amount)} recebido`,
    ...(actor.uid ? { actorId: actor.uid } : {}),
    actorName: actor.name,
    at,
  });
  if (next?.status === "em_producao") {
    tx.set(order.ref.collection("events").doc(), {
      type: "status",
      visibility: "cliente",
      from: status,
      to: "em_producao",
      message: "Sinal pago · em produção",
      actorName: "Sistema",
      at,
    });
  }
  return { paidBefore, paid, toProduction: next?.status === "em_producao" };
}

/** Depois da transação: produção, aviso ao cliente (painel e email pelo modelo) e à equipa. */
export async function afterPayment(
  order: { id: string; number: string },
  amount: number,
  toProduction: boolean,
  actorId: string,
) {
  if (toProduction) await startProductionSafely(order.id, actorId);
  await notifyCustomer(order.id, "pagamento.recebido", {
    title: `Pagamento recebido · ${order.number}`,
    body: `Recebemos ${formatKz(amount)}. Obrigado!`,
  });
}

/**
 * Confirma um pagamento que estava à espera (Multicaixa Express, referência ou transferência com comprovativo).
 * Idempotente: um webhook repetido não soma duas vezes.
 */
export async function confirmPayment(
  paymentId: string,
  actor: { uid?: string; name: string; via: "webhook" | "equipa" },
) {
  const db = adminDb();
  const paymentRef = db.collection("payments").doc(paymentId);
  const result = await db.runTransaction(async (tx) => {
    const payment = await tx.get(paymentRef);
    if (!payment.exists) throw new Error("Pagamento não encontrado.");
    if (payment.get("status") === "confirmado") return null;
    if (!["pendente", "aguarda_validacao"].includes(payment.get("status")))
      throw new Error("Este pagamento já não pode ser confirmado.");
    const orderRef = db.collection("orders").doc(payment.get("orderId"));
    const [order, items] = await Promise.all([tx.get(orderRef), tx.get(orderRef.collection("items"))]);
    if (!order.exists) throw new Error("Pedido não encontrado.");
    const amount = payment.get("amount") as number;
    const applied = applyPayment(tx, order, items, amount, { uid: actor.uid, name: actor.name });
    tx.update(paymentRef, { status: "confirmado", confirmedBy: actor.uid ?? actor.via, confirmedAt: Timestamp.now() });
    tx.set(db.collection("auditLogs").doc(), {
      actorId: actor.uid ?? "sistema",
      actorName: actor.name,
      actorRole: actor.uid ? "equipa" : "sistema",
      action: "payment.confirmed",
      entity: { type: "orders", id: orderRef.id, label: order.get("number") },
      after: { amount, method: payment.get("method"), via: actor.via },
      at: Timestamp.now(),
    });
    return {
      order: { id: orderRef.id, number: order.get("number") as string },
      amount,
      toProduction: applied.toProduction,
    };
  });
  if (result) await afterPayment(result.order, result.amount, result.toProduction, actor.uid ?? "sistema");
  return result;
}
