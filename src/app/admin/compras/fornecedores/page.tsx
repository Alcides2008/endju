import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { NewSupplierButton } from "@/features/admin/components/purchase-forms";
import { PURCHASING_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listSuppliers } from "@/features/admin/purchasing";
import { can } from "@/lib/domain/permissions";
import { formatPhone } from "@/lib/domain/phone";
import { CATEGORY_LABELS } from "@/lib/domain/stock";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function SuppliersPage() {
  const user = await requireModule("purchasing", "view", "/admin/compras/fornecedores");
  const suppliers = await listSuppliers();

  return (
    <>
      <AccountHeading title="Compras" action={can(user, "purchasing", "create") && <NewSupplierButton />}>
        {suppliers.filter((s) => s.active).length} fornecedor(es) ativo(s).
      </AccountHeading>
      <SectionTabs tabs={PURCHASING_TABS} current="/admin/compras/fornecedores" />

      {suppliers.length === 0 ? (
        <EmptyState title="Ainda não há fornecedores.">
          Junta quem te vende papel, lona, vinil e tintas, com o prazo de pagamento de cada um.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Fornecedor</TH>
              <TH>Fornece</TH>
              <TH>Contacto</TH>
              <TH>Pagamento</TH>
              <TH>Avaliação</TH>
            </TR>
          </THead>
          <TBody>
            {suppliers.map((s) => (
              <TR key={s.id} className={s.active ? undefined : "opacity-60"}>
                <TD>
                  <Link href={`/admin/compras/fornecedores/${s.id}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  {!s.active && <Badge className="ml-2">Inativo</Badge>}
                </TD>
                <TD className="max-w-64 text-ink-2">{s.categories.map((c) => CATEGORY_LABELS[c]).join(", ") || "—"}</TD>
                <TD className="text-ink-2">
                  {s.contact.name || "—"}
                  {s.contact.phone && <span className="block text-xs">{formatPhone(s.contact.phone)}</span>}
                </TD>
                <TD className="text-ink-2">{s.paymentTermsDays ? `${s.paymentTermsDays} dias` : "Pronto pagamento"}</TD>
                <TD className="text-ink-2">{s.rating ? `${s.rating} de 5` : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
