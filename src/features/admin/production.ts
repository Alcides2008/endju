import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { periodStarts } from "@/features/admin/dashboard-math";
import { can, type RoleId, type Subject } from "@/lib/domain/permissions";
import {
  OPEN_TASK_STATUSES,
  waitingFor,
  type ProductionSector,
  type TaskPriority,
  type TaskStatus,
  type TimeLog,
} from "@/lib/domain/production";
import { adminDb } from "@/lib/firebase/admin";

const date = (value: unknown) => (value as Timestamp | undefined | null)?.toDate() ?? null;

export type TaskView = {
  id: string;
  orderId: string;
  orderNumber: string;
  itemName: string;
  quantity: number;
  details: string;
  notes?: string;
  customerName: string;
  sector: ProductionSector;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueAt: Date | null;
  completedAt: Date | null;
  blockedReason?: string;
  timeLogs: TimeLog[];
  /** Setor anterior ainda por acabar (ex.: o corte espera pela impressão) */
  waitingFor: ProductionSector | null;
};

function toTask(doc: FirebaseFirestore.DocumentSnapshot): Omit<TaskView, "waitingFor"> & { dependsOn: string[] } {
  const d = doc.data()!;
  return {
    id: doc.id,
    orderId: d.orderId,
    orderNumber: d.orderNumber,
    itemName: d.itemName,
    quantity: d.quantity,
    details: d.details ?? "",
    notes: d.notes ?? undefined,
    customerName: d.customerName ?? "",
    sector: d.sector,
    status: d.status,
    priority: d.priority ?? 2,
    assigneeId: d.assigneeId ?? undefined,
    dueAt: date(d.dueAt),
    completedAt: date(d.completedAt),
    blockedReason: d.blockedReason ?? undefined,
    timeLogs: ((d.timeLogs ?? []) as { userId: string; start: Timestamp; end?: Timestamp }[]).map((log) => ({
      userId: log.userId,
      start: log.start.toDate(),
      end: date(log.end),
    })),
    dependsOn: d.dependsOn ?? [],
  };
}

/** Designer e Operador veem só o que é seu ou está livre (docs/03 · V¹ E¹); quem gere vê tudo. */
export const seesAllTasks = (user: Subject) => can(user, "production", "approve") || !can(user, "production", "edit");

/**
 * Fila da oficina: tarefas abertas (com o que cada uma espera) e as concluídas hoje.
 * Ordem: urgentes primeiro, depois o prazo mais próximo.
 * shortcut: sem reordenação manual (`sequence`) nem máquinas; o Gestor mexe na prioridade. Máquinas chegam com as Definições (6.5).
 */
export async function listProduction(user: { uid: string; role: RoleId }, now = new Date()) {
  const db = adminDb().collection("productionTasks");
  const [open, done] = await Promise.all([
    db.where("status", "in", OPEN_TASK_STATUSES).get(),
    db.where("completedAt", ">=", periodStarts(now).today).get(),
  ]);
  const all = [...open.docs, ...done.docs].map(toTask);
  const byId = new Map(all.map((t) => [t.id, t]));
  // Dependências já concluídas noutro dia não vêm na leitura: contam como feitas
  const visible = seesAllTasks(user) ? all : all.filter((t) => !t.assigneeId || t.assigneeId === user.uid);
  const tasks: TaskView[] = visible
    .map(({ dependsOn, ...t }) => ({ ...t, waitingFor: waitingFor({ dependsOn }, byId) }))
    .sort((a, b) => b.priority - a.priority || (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
  return {
    open: tasks.filter((t) => t.status !== "concluida"),
    doneToday: tasks.filter((t) => t.status === "concluida"),
  };
}

/** Pedidos em produção sem tarefas (de antes deste módulo, ou se a criação falhou). */
export async function ordersWithoutTasks() {
  const snap = await adminDb().collection("orders").where("status", "==", "em_producao").get();
  return snap.docs
    .filter((d) => !d.get("productionStartedAt"))
    .map((d) => ({ id: d.id, number: d.get("number") as string }));
}

export async function listOrderTasks(orderId: string) {
  const snap = await adminDb().collection("productionTasks").where("orderId", "==", orderId).get();
  const all = snap.docs.map(toTask);
  const byId = new Map(all.map((t) => [t.id, t]));
  return all.map(({ dependsOn, ...t }) => ({ ...t, waitingFor: waitingFor({ dependsOn }, byId) }));
}
