import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { QUOTE_STATUS } from "@/features/account/proof-status";
import { listMyQuotes } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Orçamentos" };

export default async function QuotesPage() {
  const user = await requireCustomer("/conta/orcamentos");
  const quotes = await listMyQuotes(user.uid);

  return (
    <>
      <AccountHeading
        title="Orçamentos"
        action={
          <Button asChild variant="outline">
            <Link href="/orcamento/personalizado">Pedir orçamento</Link>
          </Button>
        }
      >
        Pedidos de orçamento personalizado feitos com esta conta e as propostas que te enviámos.
      </AccountHeading>
      {quotes.length === 0 ? (
        <EmptyState title="Sem orçamentos.">
          Para trabalhos fora do catálogo, pede um orçamento personalizado e a proposta aparece aqui.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-card">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <Link
                href={`/conta/orcamentos/${quote.id}`}
                className="grid gap-2 p-5 hover:bg-paper-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-6"
              >
                <span>
                  <span className="block font-mono text-sm">{quote.number}</span>
                  <span className="text-xs text-ink-3">{formatDate(quote.createdAt)}</span>
                </span>
                <span className="line-clamp-2 text-sm text-ink-2">{quote.description}</span>
                <Badge tone={QUOTE_STATUS[quote.status].tone}>{QUOTE_STATUS[quote.status].label}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
