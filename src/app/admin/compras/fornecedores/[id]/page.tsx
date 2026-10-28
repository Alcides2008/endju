import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountHeading } from "@/features/account/components/account-heading";
import { EditSupplierForm } from "@/features/admin/components/purchase-forms";
import { requireModule } from "@/features/admin/guard";
import { getSupplier } from "@/features/admin/purchasing";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { formatPhone } from "@/lib/domain/phone";
import { PO_STATUS_META } from "@/lib/domain/stock";

export const metadata: Metadata = { title: "Fornecedor" };

export default async function SupplierPage({ params }: PageProps<"/admin/compras/fornecedores/[id]">) {
  const user = await requireModule("purchasing", "view", "/admin/compras/fornecedores");
  const supplier = await getSupplier((await params).id);
  if (!supplier) notFound();
  const spent = supplier.orders
    .filter((o) => o.status !== "cancelada" && o.status !== "rascunho")
    .reduce((sum, o) => sum + o.totals.total, 0);

  return (
    <div className="space-y-8">
      <AccountHeading
        back={{ href: "/admin/compras/fornecedores", label: "Fornecedores" }}
        title={supplier.name}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!supplier.active && <Badge>Inativo</Badge>}
            {supplier.active && can(user, "purchasing", "create") && (
              <Button asChild size="sm">
                <Link href={`/admin/compras/encomendas/nova?fornecedor=${supplier.id}`}>Nova encomenda</Link>
              </Button>
            )}
          </div>
        }
      >
        {[
          supplier.nif && `NIF ${supplier.nif}`,
          supplier.paymentTermsDays ? `paga a ${supplier.paymentTermsDays} dias` : "pronto pagamento",
          `${formatKz(spent)} em compras`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </AccountHeading>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <section aria-labelledby="encomendas" className="space-y-3">
            <h2 id="encomendas" className="text-lg font-semibold">
              Encomendas
            </h2>
            {supplier.orders.length === 0 ? (
              <p className="text-sm text-ink-2">Ainda sem encomendas.</p>
            ) : (
              <ul className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
                {supplier.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span>
                      <Link
                        href={`/admin/compras/encomendas/${o.id}`}
                        className="font-mono font-medium hover:underline"
                      >
                        {o.number}
                      </Link>
                      <span className="ml-2 text-ink-3">{formatDate(o.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs">{formatKz(o.totals.total)}</span>
                      <Badge tone={PO_STATUS_META[o.status].tone}>{PO_STATUS_META[o.status].label}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="materiais" className="space-y-3">
            <h2 id="materiais" className="text-lg font-semibold">
              Materiais que fornece
            </h2>
            {supplier.materials.length === 0 ? (
              <p className="text-sm text-ink-2">
                Liga este fornecedor aos materiais na ficha de cada material, no Stock.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {supplier.materials.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/admin/stock/${m.id}`}
                      className="inline-block rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink/40"
                    >
                      {m.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="space-y-1 rounded-sm border border-line bg-card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Contacto</h2>
            <p>{supplier.contact.name || "—"}</p>
            {supplier.contact.phone && (
              <p>
                <a href={`tel:${supplier.contact.phone}`} className="hover:underline">
                  {formatPhone(supplier.contact.phone)}
                </a>
              </p>
            )}
            {supplier.contact.email && <p className="text-ink-2">{supplier.contact.email}</p>}
            {supplier.address && <p className="text-ink-2">{supplier.address}</p>}
            {supplier.iban && <p className="font-mono text-xs text-ink-2">{supplier.iban}</p>}
          </section>
          {can(user, "purchasing", "edit") && (
            <details className="rounded-sm border border-line bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">Editar fornecedor</summary>
              <div className="mt-4">
                <EditSupplierForm
                  id={supplier.id}
                  defaults={{
                    name: supplier.name,
                    nif: supplier.nif ?? "",
                    contactName: supplier.contact.name,
                    phone: supplier.contact.phone ?? "",
                    email: supplier.contact.email ?? "",
                    categories: supplier.categories,
                    paymentTermsDays: supplier.paymentTermsDays,
                    iban: supplier.iban ?? "",
                    address: supplier.address ?? "",
                    rating: supplier.rating ?? 0,
                    notes: supplier.notes ?? "",
                    active: supplier.active,
                  }}
                />
              </div>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
