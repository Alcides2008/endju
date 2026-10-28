import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { FINANCE_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { listPayments } from "@/features/admin/finance";
import { TransferDecision } from "@/features/admin/components/finance-forms";
import { requireModule } from "@/features/admin/guard";
import { privateDeliveryUrl } from "@/lib/cloudinary";
import { formatDateTime } from "@/lib/dates";
import { PAYMENT_METHOD_LABELS } from "@/lib/domain/finance";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pagamentos" };

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/financeiro/pagamentos">) {
  const user = await requireModule("finance", "view", "/admin/financeiro/pagamentos");
  const meio = (await searchParams).meio;
  const method = typeof meio === "string" && meio in PAYMENT_METHOD_LABELS ? meio : "";
  const payments = await listPayments();
  const toValidate = payments.filter((p) => p.status === "aguarda_validacao");
  const all = payments.filter((p) => p.status === "confirmado");
  const rows = method ? all.filter((p) => p.method === method) : all;
  const filters = [["", "Todos"], ...Object.entries(PAYMENT_METHOD_LABELS)];

  return (
    <>
      <AccountHeading title="Financeiro">
        Pagamentos confirmados de clientes ({rows.length}) · {formatKz(rows.reduce((s, p) => s + p.amount, 0))}.
        Registam-se na página de cada pedido.
      </AccountHeading>
      <SectionTabs tabs={FINANCE_TABS} current="/admin/financeiro/pagamentos" />
      {toValidate.length > 0 && (
        <section
          aria-labelledby="validar"
          className="mb-8 space-y-3 rounded-sm border border-warning/40 bg-warning/5 p-4"
        >
          <h2 id="validar" className="font-semibold">
            Transferências por validar ({toValidate.length})
          </h2>
          <ul className="divide-y divide-line text-sm">
            {toValidate.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <Link href={`/admin/pedidos/${p.orderNumber}`} className="font-mono text-xs hover:underline">
                    {p.orderNumber}
                  </Link>{" "}
                  · {formatKz(p.amount)} · {p.kind}
                  {p.reference && <span className="text-ink-3"> · {p.reference}</span>}
                  {p.proof && (
                    <a
                      href={privateDeliveryUrl(p.proof.publicId, p.proof.format)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline underline-offset-4"
                    >
                      Ver comprovativo
                    </a>
                  )}
                </span>
                {can(user, "finance", "approve") && <TransferDecision paymentId={p.id} />}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filtrar por meio" className="flex flex-wrap gap-2">
          {filters.map(([key, label]) => (
            <Link
              key={key}
              href={key ? `/admin/financeiro/pagamentos?meio=${key}` : "/admin/financeiro/pagamentos"}
              aria-current={method === key ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                method === key ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        {can(user, "finance", "export") && (
          <p className="flex gap-3 text-sm text-ink-2">
            Exportar:
            {(["csv", "xls", "pdf"] as const).map((f) => (
              <a key={f} href={`/api/export/pagamentos?formato=${f}`} className="underline underline-offset-4">
                {f === "xls" ? "Excel" : f.toUpperCase()}
              </a>
            ))}
          </p>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Ainda não há pagamentos." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Data</TH>
              <TH>Pedido</TH>
              <TH>Tipo</TH>
              <TH>Meio</TH>
              <TH>Extrato</TH>
              <TH className="text-right">Valor</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((p) => (
              <TR key={p.id}>
                <TD className="whitespace-nowrap text-ink-2">{formatDateTime(p.at)}</TD>
                <TD>
                  <Link href={`/admin/pedidos/${p.orderNumber}`} className="font-mono text-xs hover:underline">
                    {p.orderNumber}
                  </Link>
                </TD>
                <TD className="text-ink-2">{p.kind}</TD>
                <TD className="text-ink-2">
                  {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                  {p.reference && <span className="block text-xs text-ink-3">{p.reference}</span>}
                </TD>
                <TD>
                  {p.method === "numerario" ? (
                    <span className="text-xs text-ink-3">numerário</span>
                  ) : (
                    <Badge tone={p.reconciled ? "success" : "warning"}>
                      {p.reconciled ? "Conferido" : "Por conferir"}
                    </Badge>
                  )}
                </TD>
                <TD className="text-right whitespace-nowrap">
                  {formatKz(p.amount)}
                  <a href={`/api/pdf/recibo/${p.id}`} className="block text-xs text-ink-3 underline underline-offset-4">
                    Recibo
                  </a>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
