import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { ImportCatalogButton } from "@/features/admin/components/catalog-forms";
import { CATALOG_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { getCatalog } from "@/features/catalog/server";
import { defaultConfig } from "@/lib/domain/catalog";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { priceItem } from "@/lib/domain/pricing";
import { SECTOR_LABELS } from "@/lib/domain/production";

export const metadata: Metadata = { title: "Catálogo" };

/** "A partir de" como na lista do site; ao m², o preço do m². */
function fromPrice(product: Awaited<ReturnType<typeof getCatalog>>[number]) {
  if (product.pricing.model === "area_m2") return `${formatKz(product.pricing.pricePerM2 ?? 0)} / m²`;
  try {
    return formatKz(priceItem(product, defaultConfig(product)).lineTotal);
  } catch {
    return "—";
  }
}

export default async function CatalogProductsPage() {
  const user = await requireModule("catalog", "view", "/admin/catalogo/produtos");
  const products = await getCatalog();
  const canImport = can(user, "catalog", "create");

  return (
    <>
      <AccountHeading title="Catálogo">
        {products.length
          ? `${products.filter((p) => p.active).length} de ${products.length} produto(s) à venda. Preços com IVA.`
          : "O catálogo ainda está no código do site."}
      </AccountHeading>
      <SectionTabs tabs={CATALOG_TABS} current="/admin/catalogo/produtos" />

      {products.length === 0 ? (
        <EmptyState
          title="Importa o catálogo para o poderes editar."
          action={canImport ? <ImportCatalogButton /> : undefined}
        >
          Passa para o Firestore os produtos, preços e páginas de serviço que o site mostra hoje, com o percurso de
          oficina de cada produto. Até lá, o site fica sem produtos.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Produto</TH>
              <TH>A partir de</TH>
              <TH>Prazo</TH>
              <TH>Oficina</TH>
              <TH>Consumo</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {products.map((p) => (
              <TR key={p.slug}>
                <TD>
                  <Link href={`/admin/catalogo/produtos/${p.slug}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-ink-3">
                    mínimo {p.minQty} {p.unit}
                  </p>
                </TD>
                <TD className="whitespace-nowrap">{fromPrice(p)}</TD>
                <TD className="whitespace-nowrap text-ink-2">
                  {p.leadTime.normalDays} d · urgente {p.leadTime.urgentDays} d
                </TD>
                <TD className="text-ink-2">{p.route.map((s) => SECTOR_LABELS[s]).join(" → ")}</TD>
                <TD className="text-ink-2">{p.consumption.length ? `${p.consumption.length} regra(s)` : "à mão"}</TD>
                <TD>
                  <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "À venda" : "Desligado"}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
