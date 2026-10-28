import type { Metadata } from "next";
import Link from "next/link";
import type { Timestamp } from "firebase-admin/firestore";
import { AccountHeading } from "@/features/account/components/account-heading";
import { periodStarts } from "@/features/admin/dashboard-math";
import { requireModule } from "@/features/admin/guard";
import { monthKey } from "@/lib/domain/finance";
import { LEAD_SOURCE_LABELS, type LeadSource } from "@/lib/domain/marketing";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { formatMinutes, minutesWorked, SECTOR_LABELS, type ProductionSector } from "@/lib/domain/production";
import { summarizeOrders } from "@/lib/domain/reports";
import { adminDb } from "@/lib/firebase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Relatórios" };

const PERIODS = [
  ["mes", "Este mês"],
  ["anterior", "Mês passado"],
  ["90d", "Últimos 90 dias"],
  ["ano", "Este ano"],
] as const;
type Period = (typeof PERIODS)[number][0];

function range(period: Period, now: Date) {
  const month = periodStarts(now).month;
  if (period === "anterior") {
    const from = new Date(month);
    from.setUTCMonth(from.getUTCMonth() - 1);
    return { from, to: month };
  }
  if (period === "90d") return { from: new Date(now.getTime() - 90 * 86_400_000), to: now };
  if (period === "ano") return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1) - 3_600_000), to: now };
  return { from: month, to: now };
}

const MONTH = new Intl.DateTimeFormat("pt-AO", { month: "short", year: "2-digit", timeZone: "UTC" });

function Bars({ rows, money = true }: { rows: { label: string; value: number; count: number }[]; money?: boolean }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-ink-2">{r.label}</span>
          <span className="h-2.5 rounded-full bg-paper-2">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </span>
          <span className="whitespace-nowrap">{money ? formatKz(r.value) : r.value}</span>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-sm border border-line bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Relatório do período: vendas, produtos, clientes, oficina e leads. shortcut: lê o período inteiro; com muito volume, agregar à noite. */
export default async function ReportsPage({ searchParams }: PageProps<"/admin/relatorios">) {
  const user = await requireModule("reports", "view", "/admin/relatorios");
  const asked = (await searchParams).periodo;
  const period: Period = PERIODS.some(([k]) => k === asked) ? (asked as Period) : "mes";
  const now = new Date();
  const { from, to } = range(period, now);
  const db = adminDb();
  const [orders, items, payments, tasks, leads] = await Promise.all([
    db.collection("orders").where("createdAt", ">=", from).where("createdAt", "<", to).get(),
    db.collectionGroup("items").get(),
    db.collection("payments").where("confirmedAt", ">=", from).where("confirmedAt", "<", to).get(),
    db.collection("productionTasks").where("completedAt", ">=", from).where("completedAt", "<", to).get(),
    db.collection("leads").where("createdAt", ">=", from).where("createdAt", "<", to).get(),
  ]);
  const summary = summarizeOrders(
    orders.docs.map((o) => {
      const dueAt = (o.get("dueAt") as Timestamp | undefined)?.toMillis() ?? Infinity;
      const doneAt = (o.get("readyAt") as Timestamp | undefined)?.toMillis();
      return {
        id: o.id,
        status: o.get("status"),
        total: o.get("totals.total") ?? 0,
        customerKey: o.get("customerId") ?? o.get("customer.phone") ?? o.id,
        customerName: o.get("customer.name") ?? "Cliente",
        month: monthKey((o.get("createdAt") as Timestamp).toDate()),
        late: doneAt ? doneAt > dueAt : dueAt < now.getTime() && !["pronto", "entregue"].includes(o.get("status")),
      };
    }),
    items.docs
      .filter((i) => i.ref.parent.parent?.parent.id === "orders")
      .map((i) => ({
        orderId: i.ref.parent.parent!.id,
        name: i.get("name") ?? "Item",
        quantity: i.get("quantity") ?? 1,
        total: i.get("lineTotal") ?? 0,
      })),
  );
  const received = payments.docs
    .filter((p) => p.get("status") === "confirmado")
    .reduce((s, p) => s + (p.get("amount") ?? 0), 0);
  const sectors = new Map<ProductionSector, { count: number; minutes: number }>();
  for (const t of tasks.docs) {
    const s = sectors.get(t.get("sector")) ?? { count: 0, minutes: 0 };
    s.count++;
    s.minutes += minutesWorked(
      ((t.get("timeLogs") ?? []) as { userId: string; start: Timestamp; end?: Timestamp }[]).map((l) => ({
        userId: l.userId,
        start: l.start.toDate(),
        end: l.end?.toDate(),
      })),
      now,
    );
    sectors.set(t.get("sector"), s);
  }
  const sources = new Map<string, { label: string; value: number; count: number }>();
  for (const l of leads.docs) {
    const key = l.get("source") as LeadSource;
    const s = sources.get(key) ?? { label: LEAD_SOURCE_LABELS[key] ?? key, value: 0, count: 0 };
    s.value++;
    if (l.get("stage") === "ganho") s.count++;
    sources.set(key, s);
  }
  const money = can(user, "finance", "view");

  return (
    <>
      <AccountHeading title="Relatórios">
        Valores com IVA incluído; os pedidos cancelados não entram nas contas.
      </AccountHeading>
      <nav aria-label="Período" className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/relatorios?periodo=${key}`}
            aria-current={period === key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              period === key ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mb-6 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Pedidos", String(summary.orders)],
          ...(money
            ? [
                ["Faturado", formatKz(summary.revenue)],
                ["Recebido", formatKz(received)],
                ["Valor médio", formatKz(summary.average)],
              ]
            : []),
          ["Fora do prazo", String(summary.late)],
        ].map(([label, value]) => (
          <div key={label} className="bg-card p-4">
            <p className="text-xs text-ink-3">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {money && summary.months.length > 1 && (
          <Section title="Faturado por mês">
            <Bars
              rows={summary.months.map((m) => ({ ...m, label: MONTH.format(new Date(`${m.label}-15T00:00:00Z`)) }))}
            />
          </Section>
        )}
        <Section title="Produtos que mais faturaram">
          {summary.products.length ? (
            <Bars rows={summary.products} money={money} />
          ) : (
            <p className="text-sm text-ink-3">Sem vendas no período.</p>
          )}
        </Section>
        {money && (
          <Section title="Melhores clientes">
            {summary.customers.length ? (
              <Bars rows={summary.customers.map((c) => ({ ...c, label: `${c.label} · ${c.count} ped.` }))} />
            ) : (
              <p className="text-sm text-ink-3">Sem vendas no período.</p>
            )}
          </Section>
        )}
        <Section title="Oficina · tarefas concluídas">
          {sectors.size ? (
            <ul className="divide-y divide-line text-sm">
              {[...sectors].map(([sector, s]) => (
                <li key={sector} className="flex justify-between gap-3 py-2">
                  <span>{SECTOR_LABELS[sector] ?? sector}</span>
                  <span className="text-ink-2">
                    {s.count} tarefa(s) · média {formatMinutes(Math.round(s.minutes / s.count))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Sem tarefas concluídas no período.</p>
          )}
        </Section>
        <Section title="Leads por origem">
          {sources.size ? (
            <Bars
              rows={[...sources.values()].map((s) => ({ ...s, label: `${s.label} · ${s.count} ganho(s)` }))}
              money={false}
            />
          ) : (
            <p className="text-sm text-ink-3">Sem leads no período.</p>
          )}
        </Section>
      </div>
    </>
  );
}
