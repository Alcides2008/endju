import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { InvoiceButton, VoidInvoiceButton } from "@/features/admin/components/finance-forms";
import { FINANCE_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { listInvoices } from "@/features/admin/finance";
import { requireModule } from "@/features/admin/guard";
import { INVOICE_LABELS } from "@/lib/domain/finance";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Faturas" };

export default async function InvoicesPage() {
  const user = await requireModule("finance", "view", "/admin/financeiro/faturas");
  const invoices = await listInvoices();
  const canCreate = can(user, "finance", "create");
  const canVoid = can(user, "finance", "approve");

  return (
    <>
      <AccountHeading title="Financeiro" action={canCreate && <InvoiceButton />}>
        As faturas saem do programa de faturação certificado pela AGT; aqui fica o registo de cada documento, ligado ao
        pedido, para as contas e o IVA. A pro-forma de cada pedido continua no próprio pedido.
      </AccountHeading>
      <SectionTabs tabs={FINANCE_TABS} current="/admin/financeiro/faturas" />
      {invoices.length === 0 ? (
        <EmptyState title="Ainda não há documentos registados." action={canCreate && <InvoiceButton />} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Documento</TH>
              <TH>Cliente</TH>
              <TH>Data</TH>
              <TH className="text-right">IVA</TH>
              <TH className="text-right">Total</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {invoices.map((inv) => (
              <TR key={inv.id}>
                <TD>
                  <p className="font-mono text-xs">{inv.number}</p>
                  <p className="text-xs text-ink-3">
                    {INVOICE_LABELS[inv.docType]}
                    {inv.orderNumber && (
                      <>
                        {" · "}
                        <Link href={`/admin/pedidos/${inv.orderNumber}`} className="hover:underline">
                          {inv.orderNumber}
                        </Link>
                      </>
                    )}
                  </p>
                </TD>
                <TD className="text-ink-2">
                  {inv.customerName}
                  {inv.customerNif && <span className="block text-xs text-ink-3">NIF {inv.customerNif}</span>}
                </TD>
                <TD className="whitespace-nowrap text-ink-2">{inv.day.split("-").reverse().join("/")}</TD>
                <TD className="text-right whitespace-nowrap text-ink-2">
                  {inv.docType === "nota_credito" ? "−" : ""}
                  {formatKz(inv.tax)}
                </TD>
                <TD className="text-right whitespace-nowrap">
                  {inv.docType === "nota_credito" ? "−" : ""}
                  {formatKz(inv.total)}
                </TD>
                <TD className="text-right">
                  {inv.status === "anulada" ? (
                    <Badge tone="danger" className="whitespace-nowrap">
                      Anulada
                    </Badge>
                  ) : (
                    canVoid && <VoidInvoiceButton id={inv.id} number={inv.number} />
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
