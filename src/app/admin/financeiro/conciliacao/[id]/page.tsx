import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading } from "@/features/account/components/account-heading";
import { LineActions } from "@/features/admin/components/finance-forms";
import { getStatementImport } from "@/features/admin/finance";
import { requireModule } from "@/features/admin/guard";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Extrato" };

const STATUS = {
  conciliada: { label: "Conciliada", tone: "success" },
  por_conciliar: { label: "Por conciliar", tone: "warning" },
  ignorada: { label: "Ignorada", tone: "neutral" },
} as const;

export default async function StatementPage({ params }: PageProps<"/admin/financeiro/conciliacao/[id]">) {
  const user = await requireModule("finance", "view", "/admin/financeiro/conciliacao");
  const statement = await getStatementImport((await params).id);
  if (!statement) notFound();
  const canEdit = can(user, "finance", "approve");
  const open = statement.lines.filter((l) => l.status === "por_conciliar").length;

  return (
    <>
      <Link href="/admin/financeiro/conciliacao" className="text-sm text-ink-2 hover:text-ink">
        ← Conciliação
      </Link>
      <AccountHeading title={statement.fileName || "Extrato"}>
        {statement.lines.length} entrada(s) · {open ? `${open} por conciliar` : "tudo conferido"}. Ignora as entradas
        que não são pagamentos de pedidos (juros, transferências internas).
      </AccountHeading>
      <Table>
        <THead>
          <TR>
            <TH>Data</TH>
            <TH>Descritivo</TH>
            <TH className="text-right">Valor</TH>
            <TH>Estado</TH>
            {canEdit && <TH />}
          </TR>
        </THead>
        <TBody>
          {statement.lines.map((line) => (
            <TR key={line.id}>
              <TD className="whitespace-nowrap text-ink-2">{line.day.split("-").reverse().join("/")}</TD>
              <TD className="max-w-80">
                {line.description}
                {line.reference && <span className="block text-xs text-ink-3">{line.reference}</span>}
              </TD>
              <TD className="text-right whitespace-nowrap">{formatKz(line.amount)}</TD>
              <TD>
                <Badge tone={STATUS[line.status].tone}>{STATUS[line.status].label}</Badge>
                {line.orderNumber && (
                  <Link
                    href={`/admin/pedidos/${line.orderNumber}`}
                    className="mt-1 block font-mono text-xs hover:underline"
                  >
                    {line.orderNumber}
                  </Link>
                )}
              </TD>
              {canEdit && (
                <TD className="text-right">
                  <LineActions importId={statement.id} lineId={line.id} status={line.status} amount={line.amount} />
                </TD>
              )}
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
