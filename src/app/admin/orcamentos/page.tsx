import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { QUOTE_STATUS } from "@/features/account/proof-status";
import { requireModule } from "@/features/admin/guard";
import { listQuotes, quoteStatusLabel as label, type QuoteStatus } from "@/features/admin/quotes";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orçamentos" };

const FILTERS: ["" | QuoteStatus, string][] = [
  ["", "Todos"],
  ["novo", "Novos"],
  ["em_analise", "Em análise"],
  ["enviado", "Enviados"],
  ["aceite", "Aceites"],
  ["convertido", "Convertidos"],
  ["recusado", "Recusados"],
  ["expirado", "Expirados"],
];

export default async function AdminQuotesPage({ searchParams }: PageProps<"/admin/orcamentos">) {
  await requireModule("quotes", "view", "/admin/orcamentos");
  const estado = (await searchParams).estado;
  const status = FILTERS.find(([key]) => key === estado)?.[0] ?? "";
  const { rows, counts, conversion } = await listQuotes(status || undefined);

  return (
    <>
      <AccountHeading title="Orçamentos">
        {(counts.novo ?? 0) + (counts.em_analise ?? 0)} por preparar · {counts.aceite ?? 0} aceite(s) por converter ·
        taxa de conversão {conversion === null ? "sem propostas enviadas" : `${Math.round(conversion * 100)} %`}
      </AccountHeading>

      <nav aria-label="Filtrar orçamentos" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(([key, text]) => (
          <Link
            key={key}
            href={key ? `/admin/orcamentos?estado=${key}` : "/admin/orcamentos"}
            aria-current={status === key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              status === key ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {text}
            {key && counts[key] ? <span className="ml-1.5 text-xs opacity-70">{counts[key]}</span> : null}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="Nenhum orçamento neste estado." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Número</TH>
              <TH>Cliente</TH>
              <TH>Pedido</TH>
              <TH>Estado</TH>
              <TH className="text-right">Total</TH>
              <TH>Recebido</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((quote) => (
              <TR key={quote.id}>
                <TD>
                  <Link href={`/admin/orcamentos/${quote.id}`} className="font-mono font-medium hover:underline">
                    {quote.number}
                  </Link>
                </TD>
                <TD>
                  {quote.name}
                  {quote.company && <span className="block text-xs text-ink-3">{quote.company}</span>}
                </TD>
                <TD className="max-w-80 truncate text-ink-2">{quote.description}</TD>
                <TD>
                  <Badge tone={QUOTE_STATUS[quote.status].tone}>{label(quote.status)}</Badge>
                </TD>
                <TD className="text-right font-mono text-xs">{quote.total ? formatKz(quote.total) : "—"}</TD>
                <TD className="text-ink-2">{formatDate(quote.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
