import type { Metadata } from "next";
import Link from "next/link";
import { AccountHeading } from "@/features/account/components/account-heading";
import { FINANCE_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { vatInputs } from "@/features/admin/finance";
import { requireModule } from "@/features/admin/guard";
import { monthKey, vatForMonth } from "@/lib/domain/finance";
import { formatKz } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "IVA" };

const MONTH = new Intl.DateTimeFormat("pt-AO", { month: "long", year: "numeric", timeZone: "UTC" });

/** Início do mês "2026-10" em Luanda (UTC+1), e o do mês seguinte. */
function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1) - 3_600_000), to: new Date(Date.UTC(y, m, 1) - 3_600_000) };
}

export default async function VatPage({ searchParams }: PageProps<"/admin/financeiro/iva">) {
  await requireModule("finance", "view", "/admin/financeiro/iva");
  const current = monthKey(new Date());
  const asked = (await searchParams).mes;
  const month = typeof asked === "string" && /^\d{4}-\d{2}$/.test(asked) && asked <= current ? asked : current;
  const { from, to } = monthRange(month);
  const vat = vatForMonth(month, await vatInputs(from, to));
  const months = Array.from({ length: 6 }, (_, i) => {
    const [y, m] = current.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
  const label = (key: string) => MONTH.format(new Date(`${key}-15T00:00:00Z`));
  const rows = [
    ["Vendas faturadas (com IVA)", vat.sales],
    ["IVA liquidado nas faturas", vat.output],
    ["IVA dedutível · despesas", vat.fromExpenses],
    ["IVA dedutível · compras de material", vat.fromPurchases],
  ] as const;

  return (
    <>
      <AccountHeading title="Financeiro">
        Estimativa do IVA do mês com o que está registado no painel: as faturas (notas de crédito a abater) e o IVA das
        despesas e das compras aprovadas. A declaração oficial sai do programa de faturação certificado e do
        contabilista.
      </AccountHeading>
      <SectionTabs tabs={FINANCE_TABS} current="/admin/financeiro/iva" />
      <nav aria-label="Mês" className="mb-6 flex flex-wrap gap-2">
        {months.map((key) => (
          <Link
            key={key}
            href={`/admin/financeiro/iva?mes=${key}`}
            aria-current={key === month ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm first-letter:uppercase",
              key === month ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {label(key)}
          </Link>
        ))}
      </nav>
      <div className="max-w-xl space-y-4">
        <h2 className="text-lg font-semibold first-letter:uppercase">{label(month)}</h2>
        <dl className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
          {rows.map(([name, value]) => (
            <div key={name} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-ink-2">{name}</dt>
              <dd className="whitespace-nowrap">{formatKz(value)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 bg-paper-2 px-4 py-3 font-semibold">
            <dt>{vat.balance >= 0 ? "IVA a entregar ao Estado" : "IVA a recuperar"}</dt>
            <dd className="whitespace-nowrap">{formatKz(Math.abs(vat.balance))}</dd>
          </div>
        </dl>
        {vat.sales === 0 && (
          <p className="text-sm text-ink-3">
            Sem faturas registadas neste mês: regista-as em{" "}
            <Link href="/admin/financeiro/faturas" className="underline underline-offset-4">
              Faturas
            </Link>{" "}
            para o IVA liquidado aparecer aqui.
          </p>
        )}
      </div>
    </>
  );
}
