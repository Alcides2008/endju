import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { QuoteResponse } from "@/features/account/components/simple-actions";
import { QUOTE_STATUS } from "@/features/account/proof-status";
import { getMyQuote } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Orçamento" };

export default async function QuotePage({ params }: PageProps<"/conta/orcamentos/[id]">) {
  const user = await requireCustomer("/conta/orcamentos");
  const quote = await getMyQuote((await params).id, user.uid);
  if (!quote) notFound();

  return (
    <div className="space-y-8">
      <AccountHeading
        back={{ href: "/conta/orcamentos", label: "Orçamentos" }}
        title={<span className="font-mono">{quote.number}</span>}
        action={<Badge tone={QUOTE_STATUS[quote.status].tone}>{QUOTE_STATUS[quote.status].label}</Badge>}
      >
        Pedido a {formatDate(quote.createdAt)}.
      </AccountHeading>

      <section aria-labelledby="pedido" className="rounded-sm border border-line bg-card p-5">
        <h2 id="pedido" className="mb-2 eyebrow text-ink-3">
          O que pediste
        </h2>
        <p className="whitespace-pre-line text-ink-2">{quote.request.description}</p>
        {quote.request.quantity && <p className="mt-3 text-sm text-ink-3">Quantidade: {quote.request.quantity}</p>}
      </section>

      {quote.version ? (
        <section aria-labelledby="proposta" className="space-y-4">
          <h2 id="proposta" className="text-lg font-semibold">
            Proposta v{quote.version.number}
            {quote.validUntil && (
              <span className="ml-2 text-sm font-normal text-ink-3">válida até {formatDate(quote.validUntil)}</span>
            )}
          </h2>
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {quote.version.lines.map((line, i) => (
              <li key={i} className="flex justify-between gap-4 p-4 text-sm">
                <span>
                  {line.description} × {line.quantity}
                </span>
                <span className="font-mono text-xs">{formatKz(line.unitPrice * line.quantity)}</span>
              </li>
            ))}
            <li className="space-y-1 p-4 text-sm">
              <p className="flex justify-between text-ink-2">
                <span>IVA</span>
                <span className="font-mono text-xs">{formatKz(quote.version.totals.tax)}</span>
              </p>
              <p className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatKz(quote.version.totals.total)}</span>
              </p>
            </li>
          </ul>
          <p className="text-sm whitespace-pre-line text-ink-3">{quote.version.terms}</p>
          <a
            href={`/api/pdf/proposta/${quote.id}`}
            className="inline-block text-sm font-medium text-brand hover:underline"
          >
            Descarregar a proposta em PDF
          </a>
          {quote.status === "enviado" && <QuoteResponse quoteId={quote.id} />}
        </section>
      ) : (
        <p className="rounded-sm border border-dashed border-line p-5 text-sm text-ink-2">
          Estamos a preparar a proposta. Respondemos no mesmo dia útil; se precisarmos de mais detalhes, falamos contigo
          por telefone ou WhatsApp.
        </p>
      )}
    </div>
  );
}
