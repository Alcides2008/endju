import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { QUOTE_STATUS } from "@/features/account/proof-status";
import { ConvertQuoteButton, QuoteAssign, QuoteEditor } from "@/features/admin/components/quote-editor";
import { requireModule } from "@/features/admin/guard";
import { listStaff } from "@/features/admin/orders";
import { getAdminQuote, quoteStatusLabel } from "@/features/admin/quotes";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { formatPhone } from "@/lib/domain/phone";

export const metadata: Metadata = { title: "Orçamento" };

export default async function AdminQuotePage({ params }: PageProps<"/admin/orcamentos/[id]">) {
  const user = await requireModule("quotes", "view", "/admin/orcamentos");
  const [quote, staff] = await Promise.all([getAdminQuote((await params).id), listStaff()]);
  if (!quote) notFound();
  const current = quote.versions[0];
  const canEdit = can(user, "quotes", "edit") && quote.status !== "convertido";
  const canConvert =
    can(user, "quotes", "approve") && current && (quote.status === "enviado" || quote.status === "aceite");

  return (
    <div className="space-y-8">
      <AccountHeading
        back={{ href: "/admin/orcamentos", label: "Orçamentos" }}
        title={<span className="font-mono">{quote.number}</span>}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={QUOTE_STATUS[quote.status].tone}>{quoteStatusLabel(quote.status)}</Badge>
            {current && (
              <a href={`/api/pdf/proposta/${quote.id}`} className="text-sm font-medium text-brand hover:underline">
                PDF da proposta
              </a>
            )}
            {canConvert && (
              <ConvertQuoteButton
                quoteId={quote.id}
                accepted={quote.status === "aceite"}
                total={formatKz(current.totals.total)}
              />
            )}
          </div>
        }
      >
        Recebido a {formatDateTime(quote.createdAt)}
        {quote.respondedAt && ` · respondido a ${formatDateTime(quote.respondedAt)}`}
        {quote.orderNumber && (
          <>
            {" "}
            · pedido{" "}
            <Link href={`/admin/pedidos/${quote.orderNumber}`} className="font-mono hover:underline">
              {quote.orderNumber}
            </Link>
          </>
        )}
      </AccountHeading>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="pedido" className="space-y-3 rounded-sm border border-line bg-card p-5">
          <h2 id="pedido" className="eyebrow text-ink-3">
            O que o cliente pediu
          </h2>
          <p className="whitespace-pre-line text-ink-2">{quote.request.description}</p>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {quote.request.quantity && (
              <div>
                <dt className="text-ink-3">Quantidade</dt>
                <dd>{quote.request.quantity}</dd>
              </div>
            )}
            {quote.request.deadline && (
              <div>
                <dt className="text-ink-3">Precisa até</dt>
                <dd>{formatDate(quote.request.deadline)}</dd>
              </div>
            )}
            {quote.request.budgetRange && (
              <div>
                <dt className="text-ink-3">Orçamento indicado</dt>
                <dd>{quote.request.budgetRange}</dd>
              </div>
            )}
          </dl>
        </section>
        <aside className="space-y-4 rounded-sm border border-line bg-card p-5 text-sm">
          <div>
            <p className="font-semibold">{quote.contact.name}</p>
            {quote.contact.company && <p className="text-ink-2">{quote.contact.company}</p>}
            <p>
              <a href={`tel:${quote.contact.phone}`} className="hover:underline">
                {formatPhone(quote.contact.phone)}
              </a>
            </p>
            {quote.contact.email && <p className="text-ink-2">{quote.contact.email}</p>}
            <p className="mt-1 text-xs text-ink-3">
              {quote.userId ? "Tem conta no site" : "Sem conta: a proposta segue por WhatsApp ou email"}
            </p>
          </div>
          {can(user, "quotes", "edit") && (
            <QuoteAssign quoteId={quote.id} assigneeId={quote.assigneeId} staff={staff} />
          )}
        </aside>
      </div>

      {canEdit && (
        <QuoteEditor
          key={quote.currentVersion}
          quoteId={quote.id}
          nextVersion={quote.currentVersion + 1}
          initial={
            current
              ? { lines: current.lines, discount: current.totals.discount, terms: current.terms, notes: current.notes }
              : null
          }
        />
      )}

      {quote.versions.length > 0 && (
        <section aria-labelledby="versoes" className="space-y-3">
          <h2 id="versoes" className="text-lg font-semibold">
            Versões enviadas
          </h2>
          {quote.versions.map((version) => (
            <details
              key={version.version}
              open={version.version === quote.currentVersion}
              className="rounded-sm border border-line bg-card"
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="font-medium">
                  v{version.version} · {formatKz(version.totals.total)}
                </span>
                <span className="text-ink-3">
                  {version.authorName} · {formatDateTime(version.createdAt)} · válida até{" "}
                  {formatDate(version.validUntil)}
                </span>
              </summary>
              <ul className="divide-y divide-line border-t border-line text-sm">
                {version.lines.map((line, i) => (
                  <li key={i} className="flex justify-between gap-4 px-4 py-2">
                    <span>
                      {line.description} × {line.quantity}
                    </span>
                    <span className="font-mono text-xs">{formatKz(line.quantity * line.unitPrice)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
