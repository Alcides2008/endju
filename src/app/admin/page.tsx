import type { Metadata } from "next";
import Link from "next/link";
import { WeeklyRevenueChart } from "@/features/admin/components/weekly-revenue-chart";
import { getDashboard, getWorkshop } from "@/features/admin/dashboard";
import { requireModule } from "@/features/admin/guard";
import { ACTION_LABELS, ENTITY_LINK } from "@/features/admin/audit-labels";
import { formatDateTime, formatWeekday } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { ACTIVE_STATUSES, ORDER_STATUS_META } from "@/lib/domain/order-status";
import { can, ROLE_LABELS } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, href, hint }: { label: string; value: string; href?: string; hint?: string }) {
  const body = (
    <>
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block bg-card p-4 hover:bg-paper-2">
      {body}
    </Link>
  ) : (
    <div className="bg-card p-4">{body}</div>
  );
}

export default async function AdminDashboardPage() {
  const user = await requireModule("dashboard", "view", "/admin");
  const production = can(user, "production", "view");
  const stock = can(user, "stock", "view");
  const [data, workshop] = await Promise.all([getDashboard(), getWorkshop({ production, stock })]);
  const money = can(user, "finance", "view");
  const byStatus = ACTIVE_STATUSES.map((status) => ({
    status,
    count: data.active.filter((o) => o.status === status).length,
  }));
  const urgent = data.active.filter((o) => o.priority === "urgente").length;
  const late = data.active.filter((o) => o.late).length;
  const awaitingDeposit = data.active.filter((o) => o.awaitingDeposit).length;

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="eyebrow text-brand">Painel · {ROLE_LABELS[user.role]}</p>
        <h1 className="text-display-md font-bold">Olá, {user.name?.split(" ")[0] ?? "equipa"}.</h1>
        <p className="text-ink-2 first-letter:uppercase">{formatWeekday(new Date())}</p>
      </header>

      {money && (
        <section aria-labelledby="receita" className="space-y-5">
          <h2 id="receita" className="sr-only">
            Receita
          </h2>
          <div className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
            <Stat label="Recebido hoje" value={formatKz(data.revenue.today)} />
            <Stat label="Esta semana" value={formatKz(data.revenue.week)} />
            <Stat label="Este mês" value={formatKz(data.revenue.month)} />
          </div>
          <div className="rounded-sm border border-line bg-card p-5">
            {data.revenue.weeks.some((w) => w.total > 0) ? (
              <WeeklyRevenueChart weeks={data.revenue.weeks} />
            ) : (
              <p className="text-sm text-ink-2">Ainda sem pagamentos confirmados nas últimas 8 semanas.</p>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="operacao" className="space-y-3">
        <h2 id="operacao" className="text-lg font-semibold">
          Pedidos em curso ({data.active.length})
        </h2>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-5">
          {byStatus.map(({ status, count }) => (
            <Stat
              key={status}
              label={ORDER_STATUS_META[status].label}
              value={String(count)}
              href={`/admin/pedidos?estado=${status}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
          <Stat label="Urgentes" value={String(urgent)} href="/admin/pedidos?urgentes=1" />
          <Stat
            label="Atrasados"
            value={String(late)}
            href="/admin/pedidos?atrasados=1"
            hint="Prazo ultrapassado e ainda não prontos"
          />
          <Stat label="À espera do sinal" value={String(awaitingDeposit)} hint="Prova aprovada, sinal por pagar" />
        </div>
      </section>

      {(production || stock) && (
        <section aria-labelledby="oficina" className="space-y-3">
          <h2 id="oficina" className="text-lg font-semibold">
            Oficina
          </h2>
          <div
            className={`grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line ${production && stock ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
          >
            {production && (
              <>
                <Stat label="Tarefas em curso" value={String(workshop.running)} href="/admin/producao" />
                <Stat label="Na fila" value={String(workshop.queued)} href="/admin/producao" />
                <Stat
                  label="Bloqueadas"
                  value={String(workshop.blocked)}
                  href="/admin/producao"
                  hint="Falta material, arte ou máquina"
                />
              </>
            )}
            {stock && (
              <Stat
                label="Stock baixo"
                value={String(workshop.low)}
                href="/admin/stock?filtro=baixo"
                hint="Materiais no mínimo ou abaixo"
              />
            )}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {can(user, "quotes", "view") && (
          <section aria-labelledby="orcamentos" className="space-y-3">
            <h2 id="orcamentos" className="text-lg font-semibold">
              Orçamentos
            </h2>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
              <Stat label="Por preparar" value={String(data.quotes.preparar)} href="/admin/orcamentos?estado=novo" />
              <Stat
                label="À espera do cliente"
                value={String(data.quotes.espera)}
                href="/admin/orcamentos?estado=enviado"
              />
              <Stat
                label="Aceites por converter"
                value={String(data.quotes.aceites)}
                href="/admin/orcamentos?estado=aceite"
              />
            </div>
            {can(user, "messaging", "view") && (
              <Link href="/admin/mensagens" className="block text-sm text-ink-2 hover:text-ink">
                {data.unreadThreads === 0
                  ? "Sem mensagens de clientes por ler."
                  : `${data.unreadThreads} mensagem(ns) de clientes por ler →`}
              </Link>
            )}
          </section>
        )}

        <section aria-labelledby="top" className="space-y-3">
          <h2 id="top" className="text-lg font-semibold">
            Mais pedidos nos últimos 30 dias
          </h2>
          <p className="text-sm text-ink-2">
            {data.last30.orders} pedido(s){money && ` · ${formatKz(data.last30.total)}`}
          </p>
          {data.last30.top.length === 0 ? (
            <p className="text-sm text-ink-3">Sem pedidos neste período.</p>
          ) : (
            <ol className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
              {data.last30.top.map((product, i) => (
                <li key={product.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span>
                    <span className="mr-2 font-mono text-xs text-ink-3">{i + 1}</span>
                    {product.name}
                  </span>
                  <span className="text-ink-2">{product.count} pedido(s)</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {can(user, "audit", "view") && (
        <section aria-labelledby="atividade" className="space-y-3">
          <h2 id="atividade" className="text-lg font-semibold">
            Atividade recente
          </h2>
          <ol className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
            {data.activity.map((entry) => {
              const href = ENTITY_LINK[entry.type]?.(entry.entityId, entry.label);
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5"
                >
                  <span>
                    <span className="font-medium">{entry.actorName}</span> {ACTION_LABELS[entry.action] ?? entry.action}{" "}
                    {href ? (
                      <Link href={href} className="font-mono text-xs hover:underline">
                        {entry.label}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{entry.label}</span>
                    )}
                  </span>
                  <span className="text-xs text-ink-3">{formatDateTime(entry.at)}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
