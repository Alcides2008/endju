import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading } from "@/features/account/components/account-heading";
import { FINANCE_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { listPayables, listReceivables } from "@/features/admin/finance";
import { requireModule } from "@/features/admin/guard";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/domain/order-status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dívidas" };

export default async function DebtsPage() {
  await requireModule("finance", "view", "/admin/financeiro/dividas");
  const [receivables, payables] = await Promise.all([listReceivables(), listPayables()]);
  const now = new Date();

  return (
    <>
      <AccountHeading title="Financeiro">
        A receber {formatKz(receivables.reduce((s, r) => s + r.due, 0))} · a pagar{" "}
        {formatKz(payables.reduce((s, p) => s + p.due, 0))}
      </AccountHeading>
      <SectionTabs tabs={FINANCE_TABS} current="/admin/financeiro/dividas" />
      <div className="space-y-10">
        <section aria-labelledby="receber" className="space-y-3">
          <h2 id="receber" className="text-lg font-semibold">
            Clientes ({receivables.length})
          </h2>
          {receivables.length === 0 ? (
            <p className="text-sm text-ink-2">Nenhum pedido com dinheiro por receber.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Pedido</TH>
                  <TH>Estado</TH>
                  <TH>Prazo</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Pago</TH>
                  <TH className="text-right">Em falta</TH>
                </TR>
              </THead>
              <TBody>
                {receivables.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/admin/pedidos/${r.number}`} className="font-mono text-xs hover:underline">
                        {r.number}
                      </Link>
                      <p className="text-xs text-ink-3">{r.customerName}</p>
                    </TD>
                    <TD>
                      <Badge tone={ORDER_STATUS_META[r.status as OrderStatus]?.tone ?? "neutral"}>
                        {ORDER_STATUS_META[r.status as OrderStatus]?.label ?? r.status}
                      </Badge>
                      {r.depositMissing > 0 && <p className="mt-1 text-xs text-warning">Sinal em falta</p>}
                    </TD>
                    <TD className="whitespace-nowrap text-ink-2">{formatDate(r.dueAt)}</TD>
                    <TD className="text-right whitespace-nowrap">{formatKz(r.total)}</TD>
                    <TD className="text-right whitespace-nowrap text-ink-2">{formatKz(r.paid)}</TD>
                    <TD className="text-right font-medium whitespace-nowrap">{formatKz(r.due)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>

        <section aria-labelledby="pagar" className="space-y-3">
          <h2 id="pagar" className="text-lg font-semibold">
            Fornecedores e despesas ({payables.length})
          </h2>
          {payables.length === 0 ? (
            <p className="text-sm text-ink-2">Nada por pagar.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Conta</TH>
                  <TH>Vence</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Em falta</TH>
                </TR>
              </THead>
              <TBody>
                {payables.map((p) => {
                  const late = p.dueAt && p.dueAt < now;
                  return (
                    <TR key={`${p.kind}-${p.id}`}>
                      <TD>
                        <Link href={p.href} className="font-medium hover:underline">
                          {p.label}
                        </Link>
                        <p className="text-xs text-ink-3">
                          {p.kind === "compra" ? "Encomenda de compra" : "Despesa"}
                          {p.party && ` · ${p.party}`}
                        </p>
                      </TD>
                      <TD className={cn("whitespace-nowrap", late ? "font-medium text-danger" : "text-ink-2")}>
                        {formatDate(p.dueAt)}
                        {late && " · vencida"}
                      </TD>
                      <TD className="text-right whitespace-nowrap">{formatKz(p.total)}</TD>
                      <TD className="text-right font-medium whitespace-nowrap">{formatKz(p.due)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
