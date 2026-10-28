import type { Metadata } from "next";
import Link from "next/link";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading } from "@/features/account/components/account-heading";
import { StatementImportForm } from "@/features/admin/components/finance-forms";
import { FINANCE_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { listStatementImports } from "@/features/admin/finance";
import { requireModule } from "@/features/admin/guard";
import { formatDateTime } from "@/lib/dates";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Conciliação" };

export default async function ReconciliationPage() {
  const user = await requireModule("finance", "view", "/admin/financeiro/conciliacao");
  const imports = await listStatementImports();

  return (
    <>
      <AccountHeading title="Financeiro">
        Importa o extrato em CSV (exportado do homebanking ou do Multicaixa) e o painel confere cada entrada com os
        pagamentos registados: o mesmo valor, até 5 dias de diferença, e o número do pedido no descritivo quando há
        dúvidas. O resto escolhe-se à mão.
      </AccountHeading>
      <SectionTabs tabs={FINANCE_TABS} current="/admin/financeiro/conciliacao" />
      <div className="space-y-6">
        {can(user, "finance", "approve") ? (
          <StatementImportForm />
        ) : (
          <p className="text-sm text-ink-3">Só o Financeiro e o Administrador importam extratos.</p>
        )}
        {imports.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Extrato</TH>
                <TH>Importado</TH>
                <TH className="text-right">Conciliadas</TH>
              </TR>
            </THead>
            <TBody>
              {imports.map((imp) => (
                <TR key={imp.id}>
                  <TD>
                    <Link href={`/admin/financeiro/conciliacao/${imp.id}`} className="font-medium hover:underline">
                      {imp.fileName || "Extrato"}
                    </Link>
                    <p className="text-xs text-ink-3">{imp.source === "multicaixa" ? "Multicaixa" : "Banco"}</p>
                  </TD>
                  <TD className="whitespace-nowrap text-ink-2">{formatDateTime(imp.at)}</TD>
                  <TD className="text-right whitespace-nowrap">
                    {imp.matchedCount} de {imp.linesCount}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </>
  );
}
