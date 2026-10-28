import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pin } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { CustomerNoteForm, EditCustomerForm } from "@/features/admin/components/customer-forms";
import { getCustomer } from "@/features/admin/customers";
import { requireModule } from "@/features/admin/guard";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { formatPhone } from "@/lib/domain/phone";

export const metadata: Metadata = { title: "Cliente" };

export default async function CustomerPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const user = await requireModule("customers", "view", "/admin/clientes");
  const customer = await getCustomer((await params).id);
  if (!customer) notFound();
  const canEdit = can(user, "customers", "edit");

  return (
    <div className="space-y-8">
      <AccountHeading back={{ href: "/admin/clientes", label: "Clientes" }} title={customer.name}>
        {customer.tradeName && `${customer.tradeName} · `}
        {formatPhone(customer.phone)}
        {customer.email && ` · ${customer.email}`}
        {customer.nif && ` · NIF ${customer.nif}`}
        {customer.hasAccount ? " · com conta no site" : " · cliente de balcão"}
      </AccountHeading>

      <dl className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-4">
        {[
          ["Pedidos", String(customer.stats.ordersCount)],
          ["Total pago", formatKz(customer.stats.totalSpent)],
          ["Em dívida", formatKz(customer.stats.balanceDue)],
          ["Último pedido", formatDate(customer.stats.lastOrderAt)],
        ].map(([label, value]) => (
          <div key={label} className="bg-card p-4">
            <dt className="eyebrow text-ink-3">{label}</dt>
            <dd className="mt-2 text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-8">
          <section aria-labelledby="pedidos" className="space-y-3">
            <h2 id="pedidos" className="text-lg font-semibold">
              Histórico de pedidos
            </h2>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-ink-3">Ainda sem pedidos.</p>
            ) : (
              <ul className="divide-y divide-line rounded-sm border border-line bg-card">
                {customer.orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/pedidos/${o.number}`}
                      className="grid gap-2 p-3 text-sm hover:bg-paper-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto_auto_7rem] sm:items-center"
                    >
                      <span className="font-mono">{o.number}</span>
                      <span className="truncate text-ink-2">{o.itemsLabel}</span>
                      <OrderStatusBadge status={o.status} />
                      <PaymentStatusBadge status={o.paymentStatus} />
                      <span className="text-right font-medium">{formatKz(o.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canEdit && (
            <section aria-labelledby="ficha" className="space-y-3">
              <h2 id="ficha" className="text-lg font-semibold">
                Ficha
              </h2>
              <div className="rounded-sm border border-line bg-card p-5">
                <EditCustomerForm
                  id={customer.id}
                  defaults={{
                    name: customer.name,
                    tradeName: customer.tradeName ?? "",
                    type: customer.type,
                    segment: customer.segment,
                    phone: formatPhone(customer.phone),
                    email: customer.email ?? "",
                    nif: customer.nif ?? "",
                    tags: customer.tags,
                    paymentTerms: customer.paymentTerms,
                  }}
                />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="notas" className="space-y-3">
            <h2 id="notas" className="text-lg font-semibold">
              Notas
            </h2>
            {canEdit && <CustomerNoteForm id={customer.id} />}
            <ul className="space-y-2">
              {customer.notes.map((note) => (
                <li key={note.id} className="rounded-sm border border-line bg-card p-3 text-sm">
                  <p className="flex items-center gap-2 text-xs text-ink-3">
                    {note.pinned && <Pin className="size-3.5 text-brand" aria-label="Fixada" />}
                    {note.authorName} · {formatDateTime(note.at)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-ink-2">{note.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {customer.addresses.length > 0 && (
            <section aria-labelledby="moradas" className="space-y-2">
              <h2 id="moradas" className="text-lg font-semibold">
                Moradas
              </h2>
              <ul className="space-y-2 text-sm text-ink-2">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="rounded-sm border border-line bg-card p-3">
                    <span className="font-medium text-ink">{a.label}</span>
                    <br />
                    {a.street}, {a.neighborhood}, {a.municipality}, {a.province}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
