import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { ImportCatalogButton } from "@/features/admin/components/catalog-forms";
import { CATALOG_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { getAllServices } from "@/features/catalog/server";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Serviços" };

export default async function CatalogServicesPage() {
  const user = await requireModule("catalog", "view", "/admin/catalogo/servicos");
  const services = await getAllServices();

  return (
    <>
      <AccountHeading title="Catálogo">
        Páginas de serviço do site, com o preço «a partir de» e os prazos.
      </AccountHeading>
      <SectionTabs tabs={CATALOG_TABS} current="/admin/catalogo/servicos" />
      {services.length === 0 ? (
        <EmptyState
          title="Importa o catálogo para editar os serviços."
          action={can(user, "catalog", "create") ? <ImportCatalogButton /> : undefined}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Serviço</TH>
              <TH>A partir de</TH>
              <TH>Prazo</TH>
              <TH>Imagens</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {services.map((s) => (
              <TR key={s.slug}>
                <TD>
                  <Link href={`/admin/catalogo/servicos/${s.slug}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                </TD>
                <TD className="whitespace-nowrap">
                  {formatKz(s.priceFrom)} <span className="text-ink-3">{s.unit}</span>
                </TD>
                <TD className="text-ink-2">{s.leadTime}</TD>
                <TD className="text-ink-2">{s.gallery.length}</TD>
                <TD>
                  <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Visível" : "Escondido"}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
