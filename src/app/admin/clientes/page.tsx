import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { ImportCustomersButton, NewCustomerButton } from "@/features/admin/components/customer-forms";
import { listCustomers } from "@/features/admin/customers";
import { requireModule } from "@/features/admin/guard";
import { formatDate } from "@/lib/dates";
import { can } from "@/lib/domain/permissions";
import { formatPhone } from "@/lib/domain/phone";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clientes" };

const SEGMENTS = [
  ["", "Todos"],
  ["particular", "Particulares"],
  ["empresa", "Empresas"],
  ["vip", "VIP"],
] as const;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  const user = await requireModule("customers", "view", "/admin/clientes");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const segmento = typeof params.segmento === "string" ? params.segmento : "";
  const customers = await listCustomers({ q: q || undefined, segment: segmento || undefined });
  const exportQs = new URLSearchParams({ ...(q ? { q } : {}), ...(segmento ? { segmento } : {}) }).toString();

  return (
    <>
      <AccountHeading
        title="Clientes"
        action={
          <div className="flex flex-wrap gap-2">
            {user.role === "admin" && <ImportCustomersButton />}
            {can(user, "customers", "create") && <NewCustomerButton />}
          </div>
        }
      >
        {customers.length} cliente(s).
      </AccountHeading>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <form action="/admin/clientes" className="flex flex-wrap items-center gap-2">
          {segmento && <input type="hidden" name="segmento" value={segmento} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome, telefone, email ou NIF"
            aria-label="Pesquisar clientes"
            className="h-10 w-72 rounded-full border border-line bg-card px-4 text-sm outline-none focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-brand/20"
          />
        </form>
        {SEGMENTS.map(([key, label]) => (
          <Link
            key={key}
            href={key ? `/admin/clientes?segmento=${key}` : "/admin/clientes"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              segmento === key && !q ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {label}
          </Link>
        ))}
        {can(user, "customers", "export") && (
          <span className="ml-auto flex gap-3 text-sm text-ink-3">
            Exportar:
            {(["csv", "xls", "pdf"] as const).map((f) => (
              <a
                key={f}
                href={`/api/export/clientes?${exportQs}&formato=${f}`}
                className="font-medium text-ink hover:underline"
              >
                {f === "xls" ? "Excel" : f.toUpperCase()}
              </a>
            ))}
          </span>
        )}
      </div>

      {customers.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-card">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="eyebrow text-ink-3">
              <tr className="border-b border-line">
                <th className="p-3 font-normal">Nome</th>
                <th className="p-3 font-normal">Contacto</th>
                <th className="p-3 font-normal">Segmento</th>
                <th className="p-3 font-normal">Etiquetas</th>
                <th className="p-3 font-normal">Desde</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                  <td className="p-3">
                    <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <span className="block text-xs text-ink-3">{c.hasAccount ? "Com conta no site" : "Balcão"}</span>
                  </td>
                  <td className="p-3 text-ink-2">
                    {formatPhone(c.phone)}
                    {c.email && <span className="block text-xs text-ink-3">{c.email}</span>}
                  </td>
                  <td className="p-3">
                    <Badge tone={c.segment === "vip" ? "brand" : "neutral"}>
                      {c.segment === "vip" ? "VIP" : c.segment === "empresa" ? "Empresa" : "Particular"}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-ink-2">{c.tags.join(", ") || "—"}</td>
                  <td className="p-3 text-ink-3">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
