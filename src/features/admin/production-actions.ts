"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import { can } from "@/lib/domain/permissions";
import { SECTOR_LABELS, type ProductionSector, type TaskStatus } from "@/lib/domain/production";
import { adminDb } from "@/lib/firebase/admin";
import { emailCustomer } from "@/features/messages/server";
import { NO_PERMISSION, staffCan } from "./guard";
import { AUDIENCE, notifyRoles, notifyUser } from "./notify";
import type { AdminResult } from "./order-actions";
import { ordersWithoutTasks } from "./production";
import { startProduction } from "./production-start";

type Log = { userId: string; start: Timestamp; end?: Timestamp };
type Task = FirebaseFirestore.DocumentSnapshot;

const actorName = (user: SessionUser) => user.name ?? user.email ?? "Equipa";
/** Gestor e Administrador mexem em qualquer tarefa; os outros só nas suas ou nas livres (docs/03 · E¹). */
const manages = (user: SessionUser) => user.role === "admin" || can(user, "production", "approve");
const label = (task: Task) => `${task.get("orderNumber")} · ${SECTOR_LABELS[task.get("sector") as ProductionSector]}`;

function closeLog(logs: Log[], at: Timestamp): Log[] {
  return logs.map((log) => (log.end ? log : { ...log, end: at }));
}

function audit(tx: FirebaseFirestore.Transaction, user: SessionUser, action: string, task: Task, after: object) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action,
    entity: { type: "productionTasks", id: task.id, label: label(task) },
    before: { status: task.get("status"), assigneeId: task.get("assigneeId") ?? null },
    after,
    at: Timestamp.now(),
  });
}

function refresh(orderNumber?: string) {
  revalidatePath("/admin/producao");
  if (orderNumber) revalidatePath(`/admin/pedidos/${orderNumber}`);
}

/** Lê a tarefa e confirma que esta pessoa pode mexer-lhe; o resto da transação faz as escritas. */
async function readTask(tx: FirebaseFirestore.Transaction, taskId: string, user: SessionUser, from: TaskStatus[]) {
  const task = await tx.get(adminDb().collection("productionTasks").doc(taskId));
  if (!task.exists) throw new Error("Tarefa não encontrada.");
  if (!manages(user) && task.get("assigneeId") && task.get("assigneeId") !== user.uid)
    throw new Error("Esta tarefa está atribuída a outra pessoa.");
  if (!from.includes(task.get("status"))) throw new Error("A tarefa mudou entretanto. Atualiza a página.");
  return task;
}

/** Setor anterior por acabar, lido dentro da transação. */
async function pendingDependency(tx: FirebaseFirestore.Transaction, task: Task) {
  for (const id of (task.get("dependsOn") ?? []) as string[]) {
    const dep = await tx.get(adminDb().collection("productionTasks").doc(id));
    if (dep.exists && dep.get("status") !== "concluida") return SECTOR_LABELS[dep.get("sector") as ProductionSector];
  }
  return null;
}

async function run(work: () => Promise<string | undefined>): Promise<AdminResult> {
  try {
    refresh(await work());
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível guardar." };
  }
}

/** Começar ou retomar: abre um registo de tempo e, se a tarefa estava livre, fica de quem a começou. */
export async function startTask(taskId: string): Promise<AdminResult> {
  const user = await staffCan("production", "edit");
  if (!user) return NO_PERMISSION;
  return run(() =>
    adminDb().runTransaction(async (tx) => {
      const task = await readTask(tx, taskId, user, ["por_fazer", "pausada"]);
      const waiting = await pendingDependency(tx, task);
      if (waiting) throw new Error(`Esta tarefa espera que a ${waiting.toLowerCase()} acabe.`);
      const at = Timestamp.now();
      tx.update(task.ref, {
        status: "em_curso",
        assigneeId: task.get("assigneeId") ?? user.uid,
        startedAt: task.get("startedAt") ?? at,
        timeLogs: [...((task.get("timeLogs") ?? []) as Log[]), { userId: user.uid, start: at }],
        updatedAt: at,
      });
      return task.get("orderNumber") as string;
    }),
  );
}

export async function pauseTask(taskId: string): Promise<AdminResult> {
  const user = await staffCan("production", "edit");
  if (!user) return NO_PERMISSION;
  return run(() =>
    adminDb().runTransaction(async (tx) => {
      const task = await readTask(tx, taskId, user, ["em_curso"]);
      const at = Timestamp.now();
      tx.update(task.ref, { status: "pausada", timeLogs: closeLog(task.get("timeLogs") ?? [], at), updatedAt: at });
      return task.get("orderNumber") as string;
    }),
  );
}

/**
 * Concluir. Se era a última tarefa do pedido, o pedido passa a "pronto" (docs/04 · em_producao → pronto)
 * e o cliente e o Atendimento são avisados.
 */
export async function completeTask(taskId: string): Promise<AdminResult> {
  const user = await staffCan("production", "edit");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  let ready: { number: string; userId?: string; pickup: boolean; orderId: string } | null = null;
  const result = await run(() =>
    db.runTransaction(async (tx) => {
      const task = await readTask(tx, taskId, user, ["por_fazer", "em_curso", "pausada"]);
      const waiting = await pendingDependency(tx, task);
      if (waiting) throw new Error(`Esta tarefa espera que a ${waiting.toLowerCase()} acabe.`);
      const orderRef = db.collection("orders").doc(task.get("orderId"));
      const [order, siblings] = await Promise.all([
        tx.get(orderRef),
        tx.get(db.collection("productionTasks").where("orderId", "==", task.get("orderId"))),
      ]);
      const at = Timestamp.now();
      tx.update(task.ref, {
        status: "concluida",
        assigneeId: task.get("assigneeId") ?? user.uid,
        completedAt: at,
        completedBy: user.uid,
        timeLogs: closeLog(task.get("timeLogs") ?? [], at),
        updatedAt: at,
      });
      audit(tx, user, "production.task_completed", task, { status: "concluida" });

      const last = siblings.docs.every((t) => t.id === task.id || t.get("status") === "concluida");
      if (last && order.get("status") === "em_producao") {
        const pickup = order.get("delivery.method") !== "entrega";
        tx.update(orderRef, { status: "pronto", readyAt: at, updatedAt: at, updatedBy: user.uid });
        tx.set(orderRef.collection("events").doc(), {
          type: "status",
          visibility: "cliente",
          from: "em_producao",
          to: "pronto",
          message: pickup ? "Pronto para levantamento" : "Pronto · a preparar o envio",
          actorName: "Sistema",
          at,
        });
        tx.set(db.collection("auditLogs").doc(), {
          actorId: user.uid,
          actorName: actorName(user),
          actorRole: user.role,
          action: "order.status_changed",
          entity: { type: "orders", id: orderRef.id, label: order.get("number") },
          before: { status: "em_producao" },
          after: { status: "pronto" },
          at,
        });
        ready = { number: order.get("number"), userId: order.get("userId"), pickup, orderId: order.id };
      }
      return task.get("orderNumber") as string;
    }),
  );
  const done = ready as { number: string; userId?: string; pickup: boolean; orderId: string } | null;
  if (result.ok && done) {
    if (done.userId) {
      await notifyUser(done.userId, {
        event: "pedido.estado",
        title: `Pedido ${done.number}: Pronto`,
        body: done.pickup
          ? "O teu pedido está pronto para levantamento."
          : "O teu pedido está pronto e vai sair para entrega.",
        link: `/conta/pedidos/${done.number}`,
      });
    }
    await emailCustomer(done.orderId, "pedido.pronto");
    await notifyRoles(AUDIENCE.sales, {
      event: "pedido.estado",
      title: `Pedido ${done.number} pronto`,
      body: done.pickup ? "Avisa o cliente para levantar." : "Prepara a entrega.",
      link: `/admin/pedidos/${done.number}`,
    });
  }
  return result;
}

const reasonSchema = z.string().trim().min(3, "Diz porque está bloqueada.").max(300);

/** Bloquear (falta material, arte com problema, máquina parada): sai da fila até alguém desbloquear. */
export async function blockTask(taskId: string, reason: string): Promise<AdminResult> {
  const user = await staffCan("production", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  return run(() =>
    adminDb().runTransaction(async (tx) => {
      const task = await readTask(tx, taskId, user, ["por_fazer", "em_curso", "pausada"]);
      const at = Timestamp.now();
      tx.update(task.ref, {
        status: "bloqueada",
        blockedReason: parsed.data,
        timeLogs: closeLog(task.get("timeLogs") ?? [], at),
        updatedAt: at,
      });
      audit(tx, user, "production.task_blocked", task, { status: "bloqueada", reason: parsed.data });
      return task.get("orderNumber") as string;
    }),
  );
}

export async function unblockTask(taskId: string): Promise<AdminResult> {
  const user = await staffCan("production", "edit");
  if (!user) return NO_PERMISSION;
  return run(() =>
    adminDb().runTransaction(async (tx) => {
      const task = await readTask(tx, taskId, user, ["bloqueada"]);
      tx.update(task.ref, {
        status: (task.get("timeLogs") ?? []).length ? "pausada" : "por_fazer",
        blockedReason: null,
        updatedAt: Timestamp.now(),
      });
      return task.get("orderNumber") as string;
    }),
  );
}

/** Atribuir a tarefa a alguém da equipa (Gestor · ação especial da Produção). */
export async function assignTask(taskId: string, assigneeId: string): Promise<AdminResult> {
  const user = await staffCan("production", "approve");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const assignee = assigneeId ? await db.collection("users").doc(assigneeId).get() : null;
  if (assigneeId && (!assignee?.exists || assignee.get("kind") !== "equipa"))
    return { ok: false, message: "Pessoa inválida." };
  let taskLabel = "";
  const result = await run(() =>
    db.runTransaction(async (tx) => {
      const task = await readTask(tx, taskId, user, ["por_fazer", "em_curso", "pausada", "bloqueada"]);
      tx.update(task.ref, { assigneeId: assigneeId || null, updatedAt: Timestamp.now() });
      audit(tx, user, "production.task_assigned", task, { assigneeId: assigneeId || null });
      taskLabel = label(task);
      return task.get("orderNumber") as string;
    }),
  );
  if (result.ok && assigneeId && assigneeId !== user.uid) {
    await notifyUser(assigneeId, {
      event: "tarefa.atribuida",
      title: `Tarefa atribuída: ${taskLabel}`,
      body: `Por ${actorName(user)}.`,
      link: "/admin/producao",
    });
  }
  return result;
}

export async function setTaskPriority(taskId: string, priority: number): Promise<AdminResult> {
  const user = await staffCan("production", "approve");
  if (!user) return NO_PERMISSION;
  if (![1, 2, 3].includes(priority)) return { ok: false, message: "Prioridade inválida." };
  return run(() =>
    adminDb().runTransaction(async (tx) => {
      const task = await readTask(tx, taskId, user, ["por_fazer", "em_curso", "pausada", "bloqueada"]);
      tx.update(task.ref, { priority, updatedAt: Timestamp.now() });
      audit(tx, user, "production.task_priority", task, { priority });
      return task.get("orderNumber") as string;
    }),
  );
}

/** Cria as tarefas dos pedidos que já estavam em produção sem elas. */
export async function createMissingTasks(): Promise<AdminResult & { created?: number }> {
  const user = await staffCan("production", "create");
  if (!user) return NO_PERMISSION;
  let created = 0;
  for (const order of await ordersWithoutTasks()) {
    created += await startProduction(order.id, user.uid);
  }
  refresh();
  return { ok: true, created };
}
