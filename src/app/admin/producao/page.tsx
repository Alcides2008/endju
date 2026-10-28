import type { Metadata } from "next";
import Link from "next/link";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { CreateMissingTasksButton, TaskCard, type BoardTask } from "@/features/admin/components/production-board";
import { requireModule } from "@/features/admin/guard";
import { listMaterials } from "@/features/admin/materials";
import { listStaff } from "@/features/admin/orders";
import { listProduction, ordersWithoutTasks, type TaskView } from "@/features/admin/production";
import { formatDateTime } from "@/lib/dates";
import { can } from "@/lib/domain/permissions";
import { minutesWorked, SECTOR_LABELS, WORKSHOP_SECTORS, type ProductionSector } from "@/lib/domain/production";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Produção" };

export default async function ProductionPage({ searchParams }: PageProps<"/admin/producao">) {
  const user = await requireModule("production", "view", "/admin/producao");
  const setor = (await searchParams).setor;
  const sector = WORKSHOP_SECTORS.find((s) => s === setor);
  const now = new Date();
  const consume = can(user, "stock", "create");
  const [{ open, doneToday }, staff, missing, materials] = await Promise.all([
    listProduction(user, now),
    listStaff(),
    can(user, "production", "create") ? ordersWithoutTasks() : Promise.resolve([]),
    consume ? listMaterials() : Promise.resolve([]),
  ]);
  const names = new Map(staff.map((s) => [s.uid, s.name]));
  const toBoard = (t: TaskView): BoardTask => ({
    ...t,
    assigneeName: t.assigneeId ? (names.get(t.assigneeId) ?? "Equipa") : undefined,
    late: !!t.dueAt && t.dueAt < now,
    minutes: minutesWorked(t.timeLogs, now),
  });
  const perms = {
    uid: user.uid,
    edit: can(user, "production", "edit"),
    manage: user.role === "admin" || can(user, "production", "approve"),
    consume,
  };
  const materialOptions = materials
    .filter((m) => m.active)
    .map((m) => ({ id: m.id, name: m.name, unit: m.unit, qty: m.qty }));
  const columns = (sector ? [sector] : WORKSHOP_SECTORS).map((s) => ({
    sector: s,
    tasks: open.filter((t) => t.sector === s).map(toBoard),
  }));
  const count = (s: ProductionSector) => open.filter((t) => t.sector === s).length;
  const running = open.filter((t) => t.status === "em_curso").length;
  const blocked = open.filter((t) => t.status === "bloqueada").length;

  return (
    <>
      <AccountHeading title="Produção">
        {running} em curso · {open.length - running - blocked} na fila
        {blocked > 0 && <span className="text-danger"> · {blocked} bloqueada(s)</span>} · {doneToday.length}{" "}
        concluída(s) hoje
      </AccountHeading>

      {missing.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-warning/40 bg-warning/8 p-4 text-sm">
          <p>
            {missing.length} pedido(s) em produção sem tarefas na oficina (
            {missing
              .slice(0, 4)
              .map((o) => o.number)
              .join(", ")}
            {missing.length > 4 && "…"}). Entraram antes deste módulo ou a criação falhou.
          </p>
          <CreateMissingTasksButton count={missing.length} />
        </div>
      )}

      <nav aria-label="Filtrar por setor" className="mb-5 flex flex-wrap gap-2">
        {[undefined, ...WORKSHOP_SECTORS].map((s) => (
          <Link
            key={s ?? "todos"}
            href={s ? `/admin/producao?setor=${s}` : "/admin/producao"}
            aria-current={sector === s ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              sector === s ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {s ? SECTOR_LABELS[s] : "Todos os setores"}
            {s && count(s) > 0 && <span className="ml-1.5 text-xs opacity-70">{count(s)}</span>}
          </Link>
        ))}
      </nav>

      {open.length === 0 && doneToday.length === 0 ? (
        <EmptyState title="A oficina está sem trabalho em fila.">
          As tarefas aparecem aqui quando um pedido entra em produção (provas aprovadas e sinal pago).
        </EmptyState>
      ) : (
        <div className={cn("grid gap-6", !sector && "lg:grid-cols-3")}>
          {columns.map((column) => (
            <section key={column.sector} aria-labelledby={`setor-${column.sector}`} className="space-y-3">
              <h2 id={`setor-${column.sector}`} className="flex items-baseline justify-between text-sm font-semibold">
                {SECTOR_LABELS[column.sector]}
                <span className="font-normal text-ink-3">{column.tasks.length}</span>
              </h2>
              {column.tasks.length === 0 ? (
                <p className="rounded-sm border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
                  Nada em fila.
                </p>
              ) : (
                <ul className={cn("space-y-3", sector && "grid gap-3 space-y-0 sm:grid-cols-2 xl:grid-cols-3")}>
                  {column.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} perms={perms} staff={staff} materials={materialOptions} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {doneToday.length > 0 && (
        <section aria-labelledby="hoje" className="mt-10 space-y-3">
          <h2 id="hoje" className="text-lg font-semibold">
            Concluídas hoje
          </h2>
          <ul className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
            {doneToday.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <span>
                  <Link href={`/admin/pedidos/${t.orderNumber}`} className="font-mono text-xs hover:underline">
                    {t.orderNumber}
                  </Link>{" "}
                  · {SECTOR_LABELS[t.sector]} · {t.itemName} × {t.quantity}
                </span>
                <span className="text-ink-3">
                  {names.get(t.assigneeId ?? "") ?? "Equipa"} · {formatDateTime(t.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
