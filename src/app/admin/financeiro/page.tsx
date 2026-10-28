import type { Metadata } from "next";
import Link from "next/link";
import { AccountHeading } from "@/features/account/components/account-heading";
import { FINANCE_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { periodStarts } from "@/features/admin/dashboard-math";
import { listExpenses, listPayables, listPayments, listReceivables, vatInputs } from "@/features/admin/finance";
import { requireModule } from "@/features/admin/guard";
import { monthKey, vatForMonth } from "@/lib/domain/finance";
import { formatKz } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Financeiro" };

function Stat({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "danger";
}) {
  const body = (
    <>
      <p className="text-xs text-ink-3">{label}</p>
      <p
        className={`mt-1 font-display text-2xl font-semibold tracking-tight ${tone === "danger" ? "text-danger" : ""}`}
      >
        {value}
      </p>
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

export default async function FinancePage() {
  await requireModule("finance", "view", "/admin/financeiro");
  const now = new Date();
  const { month: monthStart } = periodStarts(now);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const month = monthKey(now);
  const [payments, receivables, payables, expenses, vat] = await Promise.all([
    listPayments(),
    listReceivables(),
    listPayables(),
    listExpenses(),
    vatInputs(monthStart, nextMonth),
  ]);
  const received = payments
    .filter((p) => p.status === "confirmado" && p.at && p.at >= monthStart)
    .reduce((s, p) => s + p.amount, 0);
  const toReceive = receivables.reduce((s, r) => s + r.due, 0);
  const deposits = receivables.filter((r) => r.depositMissing > 0);
  const toPay = payables.reduce((s, p) => s + p.due, 0);
  const overdue = payables.filter((p) => p.dueAt && p.dueAt < now);
  const spent = expenses.filter((e) => e.day.startsWith(month)).reduce((s, e) => s + e.amount, 0);
  const tax = vatForMonth(month, vat);
  const unreconciled = payments.filter(
    (p) => p.status === "confirmado" && !p.reconciled && p.method !== "numerario",
  ).length;

  return (
    <>
      <AccountHeading title="Financeiro">
        Valores com IVA incluído. O mês conta a partir do dia 1, hora de Luanda.
      </AccountHeading>
      <SectionTabs tabs={FINANCE_TABS} current="/admin/financeiro" />
      <div className="space-y-6">
        <div className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
          <Stat label="Recebido este mês" value={formatKz(received)} href="/admin/financeiro/pagamentos" />
          <Stat label="Despesas deste mês" value={formatKz(spent)} href="/admin/financeiro/despesas" />
          <Stat
            label="IVA a entregar (estimativa)"
            value={formatKz(Math.max(0, tax.balance))}
            hint={tax.balance < 0 ? `IVA a recuperar: ${formatKz(-tax.balance)}` : "Pelas faturas registadas este mês"}
            href="/admin/financeiro/iva"
          />
        </div>
        <div className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="A receber de clientes"
            value={formatKz(toReceive)}
            hint={`${receivables.length} pedido(s)`}
            href="/admin/financeiro/dividas"
          />
          <Stat
            label="Sinais em falta"
            value={String(deposits.length)}
            hint="Pedidos à espera do sinal"
            href="/admin/financeiro/dividas"
          />
          <Stat
            label="A pagar"
            value={formatKz(toPay)}
            hint={`${payables.length} conta(s)`}
            href="/admin/financeiro/dividas"
          />
          <Stat
            label="Contas vencidas"
            value={String(overdue.length)}
            tone={overdue.length ? "danger" : undefined}
            hint={overdue.length ? formatKz(overdue.reduce((s, p) => s + p.due, 0)) : "Nada vencido"}
            href="/admin/financeiro/dividas"
          />
        </div>
        <p className="text-sm text-ink-2">
          {unreconciled
            ? `${unreconciled} pagamento(s) por transferência ou Multicaixa ainda por conferir com o extrato. `
            : "Todos os pagamentos eletrónicos estão conferidos com o extrato. "}
          <Link href="/admin/financeiro/conciliacao" className="underline underline-offset-4">
            Conciliação →
          </Link>
        </p>
      </div>
    </>
  );
}
