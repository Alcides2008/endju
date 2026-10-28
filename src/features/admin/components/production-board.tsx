"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Lock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Drawer } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/dates";
import { parseDecimal } from "@/lib/domain/money";
import {
  formatMinutes,
  PRIORITY_LABELS,
  SECTOR_LABELS,
  TASK_STATUS_META,
  type ProductionSector,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain/production";
import { UNIT_LABELS, type StockUnit } from "@/lib/domain/stock";
import { cn } from "@/lib/utils";
import {
  assignTask,
  blockTask,
  completeTask,
  createMissingTasks,
  pauseTask,
  setTaskPriority,
  startTask,
  unblockTask,
} from "../production-actions";
import { recordMovement } from "../stock-actions";
import { useRun } from "./order-admin-panel";

export type BoardTask = {
  id: string;
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
  assigneeName?: string;
  dueAt: Date | null;
  late: boolean;
  minutes: number;
  blockedReason?: string;
  waitingFor: ProductionSector | null;
};

export type BoardPermissions = {
  uid: string;
  edit: boolean;
  manage: boolean;
  consume: boolean;
};

type MaterialOption = { id: string; name: string; unit: StockUnit; qty: number };

/** Ação principal do cartão, conforme o estado: o que o operador faz a seguir. */
function PrimaryActions({ task, canAct }: { task: BoardTask; canAct: boolean }) {
  const { pending, run } = useRun();
  if (!canAct) return null;
  if (task.status === "bloqueada")
    return (
      <Button
        size="sm"
        variant="outline"
        loading={pending}
        onClick={() => run(() => unblockTask(task.id), "Tarefa desbloqueada.")}
      >
        Desbloquear
      </Button>
    );
  if (task.status === "em_curso")
    return (
      <div className="flex gap-2">
        <Button size="sm" loading={pending} onClick={() => run(() => completeTask(task.id), "Tarefa concluída.")}>
          Concluir
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => pauseTask(task.id), "Tarefa em pausa.")}
        >
          Pausar
        </Button>
      </div>
    );
  return (
    <Button
      size="sm"
      variant={task.status === "pausada" ? "primary" : "ink"}
      loading={pending}
      disabled={Boolean(task.waitingFor)}
      onClick={() => run(() => startTask(task.id), task.status === "pausada" ? "Tarefa retomada." : "Tarefa começada.")}
    >
      {task.status === "pausada" ? "Retomar" : "Começar"}
    </Button>
  );
}

function ConsumptionForm({ task, materials }: { task: BoardTask; materials: MaterialOption[] }) {
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");
  const { pending, run } = useRun();
  const material = materials.find((m) => m.id === materialId);
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Registar consumo de material</h3>
      {materials.length === 0 ? (
        <p className="text-sm text-ink-2">Ainda não há materiais no Stock.</p>
      ) : (
        <>
          <Field label="Material">
            <Select
              options={materials.map((m) => ({ value: m.id, label: m.name }))}
              value={materialId}
              onValueChange={setMaterialId}
            />
          </Field>
          <Field label={`Quantidade${material ? ` (${UNIT_LABELS[material.unit]})` : ""}`}>
            <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Ex.: 12,5" />
          </Field>
          <Button
            size="sm"
            variant="outline"
            loading={pending}
            disabled={!materialId || !qty}
            onClick={() =>
              run(
                () =>
                  recordMovement({
                    materialId,
                    type: "saida",
                    qty: parseDecimal(qty),
                    reason: "",
                    taskId: task.id,
                  }),
                "Consumo registado.",
                () => setQty(""),
              )
            }
          >
            Tirar do stock
          </Button>
        </>
      )}
    </div>
  );
}

/** Detalhe da tarefa: atribuir, prioridade, bloquear e consumo (o que não cabe no cartão). */
function TaskDrawer({
  task,
  canAct,
  perms,
  staff,
  materials,
}: {
  task: BoardTask;
  canAct: boolean;
  perms: BoardPermissions;
  staff: { uid: string; name: string }[];
  materials: MaterialOption[];
}) {
  const [reason, setReason] = useState("");
  const { pending, run } = useRun();
  const open = task.status !== "concluida";
  return (
    <Drawer
      title={`${task.itemName} × ${task.quantity}`}
      description={`${task.orderNumber} · ${SECTOR_LABELS[task.sector]} · ${task.customerName}`}
      trigger={
        <Button size="sm" variant="ghost">
          Detalhes
        </Button>
      }
    >
      <div className="space-y-6">
        <dl className="space-y-2 text-sm">
          {task.details && (
            <div>
              <dt className="text-ink-3">Especificações</dt>
              <dd>{task.details}</dd>
            </div>
          )}
          {task.notes && (
            <div>
              <dt className="text-ink-3">Notas do cliente</dt>
              <dd className="whitespace-pre-line">{task.notes}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-3">Prazo</dt>
            <dd className={cn(task.late && "font-medium text-danger")}>
              {formatDate(task.dueAt)}
              {task.late && " · atrasado"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Tempo registado</dt>
            <dd>{formatMinutes(task.minutes)}</dd>
          </div>
        </dl>
        <Link
          href={`/admin/pedidos/${task.orderNumber}/ordem-producao`}
          className="inline-block text-sm font-medium text-brand hover:underline"
        >
          Ver ordem de produção →
        </Link>

        {perms.manage && open && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responsável">
              <Select
                options={[
                  { value: "-", label: "Sem responsável" },
                  ...staff.map((s) => ({ value: s.uid, label: s.name })),
                ]}
                value={task.assigneeId ?? "-"}
                onValueChange={(v) => run(() => assignTask(task.id, v === "-" ? "" : v), "Responsável atualizado.")}
                disabled={pending}
              />
            </Field>
            <Field label="Prioridade">
              <Select
                options={([3, 2, 1] as TaskPriority[]).map((p) => ({ value: String(p), label: PRIORITY_LABELS[p] }))}
                value={String(task.priority)}
                onValueChange={(v) => run(() => setTaskPriority(task.id, Number(v)), "Prioridade atualizada.")}
                disabled={pending}
              />
            </Field>
          </div>
        )}

        {canAct && open && task.status !== "bloqueada" && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Bloquear</h3>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: falta lona de 440 g; arte com a cor errada"
              aria-label="Motivo do bloqueio"
            />
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              disabled={reason.trim().length < 3}
              onClick={() =>
                run(
                  () => blockTask(task.id, reason),
                  "Tarefa bloqueada.",
                  () => setReason(""),
                )
              }
            >
              Bloquear tarefa
            </Button>
          </div>
        )}

        {perms.consume && <ConsumptionForm task={task} materials={materials} />}
      </div>
    </Drawer>
  );
}

export function TaskCard({
  task,
  perms,
  staff,
  materials,
}: {
  task: BoardTask;
  perms: BoardPermissions;
  staff: { uid: string; name: string }[];
  materials: MaterialOption[];
}) {
  const canAct = perms.edit && (perms.manage || !task.assigneeId || task.assigneeId === perms.uid);
  const meta = TASK_STATUS_META[task.status];
  return (
    <li
      className={cn(
        "space-y-3 rounded-sm border bg-card p-4",
        task.status === "em_curso" ? "border-brand/50" : "border-line",
        task.status === "bloqueada" && "border-danger/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin/pedidos/${task.orderNumber}`} className="font-mono text-xs text-ink-3 hover:text-ink">
            {task.orderNumber}
          </Link>
          <p className="leading-snug font-semibold">
            {task.itemName} <span className="font-normal text-ink-2">× {task.quantity}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {task.priority === 3 && (
            <Badge tone="danger">
              <Zap className="size-3" aria-hidden />
              Urgente
            </Badge>
          )}
        </div>
      </div>
      {task.details && <p className="line-clamp-2 text-sm text-ink-2">{task.details}</p>}
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
        <span>{task.customerName}</span>
        <span className={cn(task.late && "font-medium text-danger")}>
          {task.late ? "Atrasado · " : "Prazo "}
          {formatDate(task.dueAt)}
        </span>
        {task.minutes > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {formatMinutes(task.minutes)}
          </span>
        )}
        <span>{task.assigneeName ?? "Livre"}</span>
      </p>
      {task.waitingFor && task.status !== "bloqueada" && (
        <p className="inline-flex items-center gap-1.5 text-xs text-ink-2">
          <Lock className="size-3" aria-hidden />À espera da {SECTOR_LABELS[task.waitingFor].toLowerCase()}
        </p>
      )}
      {task.blockedReason && task.status === "bloqueada" && (
        <p className="rounded-xs bg-danger/8 px-2 py-1.5 text-xs text-danger">{task.blockedReason}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PrimaryActions task={task} canAct={canAct} />
        <TaskDrawer task={task} canAct={canAct} perms={perms} staff={staff} materials={materials} />
      </div>
    </li>
  );
}

export function CreateMissingTasksButton({ count }: { count: number }) {
  const { pending, run } = useRun();
  return (
    <Button size="sm" loading={pending} onClick={() => run(createMissingTasks, "Tarefas criadas.")}>
      Criar tarefas ({count})
    </Button>
  );
}
