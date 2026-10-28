import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { ExpenseButton, PayExpenseButton } from "@/features/admin/components/finance-forms";
import { FINANCE_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { listExpenses } from "@/features/admin/finance";
import { requireModule } from "@/features/admin/guard";
import { listSuppliers } from "@/features/admin/purchasing";
import { EXPENSE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/domain/finance";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Despesas" };

const date = (day: string) => day.split("-").reverse().join("/");

export default async function ExpensesPage() {
  const user = await requireModule("finance", "view", "/admin/financeiro/despesas");
  const [expenses, suppliers] = await Promise.all([listExpenses(), listSuppliers()]);
  const options = suppliers.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }));
  const canCreate = can(user, "finance", "create");
  const canEdit = can(user, "finance", "edit");
  const pending = expenses.filter((e) => e.status === "pendente");

  return (
    <>
      <AccountHeading title="Financeiro" action={canCreate && <ExpenseButton suppliers={options} />}>
        Despesas da empresa: renda, energia, combustível, salários. As compras de material ficam nas Compras.{" "}
        {pending.length > 0 && `${pending.length} por pagar · ${formatKz(pending.reduce((s, e) => s + e.amount, 0))}.`}
      </AccountHeading>
      <SectionTabs tabs={FINANCE_TABS} current="/admin/financeiro/despesas" />
      {can(user, "finance", "export") && expenses.length > 0 && (
        <p className="mb-4 flex justify-end gap-3 text-sm text-ink-2">
          Exportar:
          {(["csv", "xls", "pdf"] as const).map((f) => (
            <a key={f} href={`/api/export/despesas?formato=${f}`} className="underline underline-offset-4">
              {f === "xls" ? "Excel" : f.toUpperCase()}
            </a>
          ))}
        </p>
      )}
      {expenses.length === 0 ? (
        <EmptyState
          title="Ainda não há despesas registadas."
          action={canCreate && <ExpenseButton suppliers={options} />}
        >
          Regista as despesas do mês para veres o que sai, o que está por pagar e o IVA que podes deduzir.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Data</TH>
              <TH>Despesa</TH>
              <TH className="text-right">Valor</TH>
              <TH>Estado</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {expenses.map((e) => (
              <TR key={e.id}>
                <TD className="whitespace-nowrap text-ink-2">{date(e.day)}</TD>
                <TD>
                  <p className="font-medium">{e.description}</p>
                  <p className="text-xs text-ink-3">
                    {EXPENSE_LABELS[e.category]}
                    {e.supplierName && ` · ${e.supplierName}`}
                    {e.recurring && " · mensal"}
                  </p>
                </TD>
                <TD className="text-right whitespace-nowrap">
                  {formatKz(e.amount)}
                  {e.taxAmount > 0 && <p className="text-xs text-ink-3">IVA {formatKz(e.taxAmount)}</p>}
                </TD>
                <TD>
                  {e.status === "pago" ? (
                    <Badge tone="success">Pago · {PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod}</Badge>
                  ) : (
                    <Badge tone="warning">{e.dueDay ? `Vence a ${date(e.dueDay)}` : "Por pagar"}</Badge>
                  )}
                </TD>
                <TD className="text-right whitespace-nowrap">
                  {e.status === "pendente" && canEdit && (
                    <span className="flex justify-end gap-1">
                      <ExpenseButton expense={e} suppliers={options} />
                      <PayExpenseButton id={e.id} amount={e.amount} />
                    </span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
