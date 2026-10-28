import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { getProductDoc } from "@/features/admin/catalog";
import { ProductForm } from "@/features/admin/components/catalog-forms";
import { requireModule } from "@/features/admin/guard";
import { listMaterials } from "@/features/admin/materials";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Produto" };

export default async function CatalogProductPage({ params }: PageProps<"/admin/catalogo/produtos/[id]">) {
  const user = await requireModule("catalog", "view", "/admin/catalogo/produtos");
  const slug = (await params).id;
  const [product, materials] = await Promise.all([getProductDoc(slug), listMaterials()]);
  if (!product) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/catalogo/produtos" className="text-sm text-ink-2 hover:text-ink">
        ← Catálogo
      </Link>
      <AccountHeading
        title={product.name}
        action={
          <Link href={`/orcamento/${product.slug}`} target="_blank" className="text-sm text-ink-2 hover:text-ink">
            Ver no site ↗
          </Link>
        }
      >
        Preço por{" "}
        {product.pricing.model === "tiered_unit"
          ? "escalões de quantidade"
          : product.pricing.model === "area_m2"
            ? "m²"
            : "unidade"}{" "}
        · o modelo de preço e as pré-visualizações não mudam aqui.
      </AccountHeading>
      <ProductForm
        product={product}
        canEdit={can(user, "catalog", "edit")}
        materials={materials.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, unit: m.unit }))}
      />
    </div>
  );
}
