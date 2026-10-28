/** Produção na oficina (docs/02 · productionTasks): setores, percurso de cada produto e tempos. Funções puras. */

import type { Tone } from "./order-status";

export const SECTORS = ["design", "impressao", "corte", "acabamento", "expedicao"] as const;
export type ProductionSector = (typeof SECTORS)[number];

export const SECTOR_LABELS: Record<ProductionSector, string> = {
  design: "Design",
  impressao: "Impressão",
  corte: "Corte",
  acabamento: "Acabamento",
  expedicao: "Expedição",
};

/** Setores com fila na página da Produção (o design trata-se nas Provas e a expedição depois de "pronto"). */
export const WORKSHOP_SECTORS: ProductionSector[] = ["impressao", "corte", "acabamento"];

export const TASK_STATUSES = ["por_fazer", "em_curso", "pausada", "concluida", "bloqueada"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_META: Record<TaskStatus, { label: string; tone: Tone }> = {
  por_fazer: { label: "Por fazer", tone: "neutral" },
  em_curso: { label: "Em curso", tone: "brand" },
  pausada: { label: "Pausada", tone: "warning" },
  concluida: { label: "Concluída", tone: "success" },
  bloqueada: { label: "Bloqueada", tone: "danger" },
};

export const OPEN_TASK_STATUSES: TaskStatus[] = ["por_fazer", "em_curso", "pausada", "bloqueada"];

export type TaskPriority = 1 | 2 | 3;
export const PRIORITY_LABELS: Record<TaskPriority, string> = { 1: "Baixa", 2: "Normal", 3: "Urgente" };

/**
 * Percurso de cada produto pela oficina, por ordem: cada setor espera pelo anterior.
 * Isto é só o percurso inicial ao importar o catálogo; depois edita-se em cada produto, no painel.
 * Artigos fora do catálogo (orçamentos) seguem o percurso por omissão.
 */
const ROUTES: Record<string, ProductionSector[]> = {
  "cartoes-de-visita": ["impressao", "corte", "acabamento"],
  flyers: ["impressao", "corte"],
  "roll-up": ["impressao", "acabamento"],
  lona: ["impressao", "acabamento"],
  "vinil-autocolante": ["impressao", "corte"],
  "caixas-de-envio": ["impressao", "corte", "acabamento"],
  "coletes-refletores": ["impressao", "acabamento"],
  "t-shirts-personalizadas": ["impressao", "acabamento"],
  "bones-bordados": ["acabamento"],
};
const DEFAULT_ROUTE: ProductionSector[] = ["impressao", "acabamento"];

export const routeFor = (productId: string) => ROUTES[productId] ?? DEFAULT_ROUTE;

/** Id fixo por item e setor: criar as tarefas duas vezes escreve as mesmas, nunca duplica. */
export const taskId = (orderId: string, itemId: string, sector: ProductionSector) => `${orderId}_${itemId}_${sector}`;

export type PlannedTask = { id: string; itemId: string; sector: ProductionSector; dependsOn: string[] };

/** Tarefas de um pedido: um setor do percurso por item, cada um dependente do anterior. */
export function planTasks(
  orderId: string,
  items: { id: string; productId: string }[],
  routeOf: (productId: string) => ProductionSector[] = routeFor,
): PlannedTask[] {
  return items.flatMap((item) =>
    routeOf(item.productId).map((sector, i, route) => ({
      id: taskId(orderId, item.id, sector),
      itemId: item.id,
      sector,
      dependsOn: i === 0 ? [] : [taskId(orderId, item.id, route[i - 1])],
    })),
  );
}

/** Setor que ainda falta terminar antes desta tarefa, ou null se pode começar. */
export function waitingFor(
  task: { dependsOn: string[] },
  statusById: Map<string, { status: TaskStatus; sector: ProductionSector }>,
): ProductionSector | null {
  for (const id of task.dependsOn) {
    const dep = statusById.get(id);
    if (dep && dep.status !== "concluida") return dep.sector;
  }
  return null;
}

export type TimeLog = { userId: string; start: Date; end?: Date | null };

/** Minutos trabalhados, contando o registo aberto até agora. */
export function minutesWorked(logs: TimeLog[], now = new Date()) {
  const ms = logs.reduce((sum, log) => sum + ((log.end ?? now).getTime() - log.start.getTime()), 0);
  return Math.max(0, Math.round(ms / 60000));
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
