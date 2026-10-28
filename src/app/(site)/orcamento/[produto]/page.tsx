import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PRODUCTS } from "@/content/products";
import { getProduct, getProducts } from "@/features/catalog/server";
import { Configurator } from "@/features/configurator/components/configurator";
import { publicProduct } from "@/lib/domain/catalog";

// O produto vem do endereço e decide a resposta 404 (com Suspense, um produto inexistente responderia 200).
// Todas as páginas são pré-geradas, por isso a navegação continua rápida sem a validação "instant".
export const instant = false;

export async function generateStaticParams() {
  const slugs = (await getProducts()).map((product) => product.slug);
  // Com Cache Components a lista não pode vir vazia: antes de importar o catálogo, usa os produtos iniciais
  return (slugs.length ? slugs : PRODUCTS.map((p) => p.slug)).map((produto) => ({ produto }));
}

export async function generateMetadata({ params }: PageProps<"/orcamento/[produto]">): Promise<Metadata> {
  const product = await getProduct((await params).produto);
  return product ? { title: `${product.name} · Orçamento online`, description: product.summary } : {};
}

export default async function ProductConfiguratorPage({ params }: PageProps<"/orcamento/[produto]">) {
  const product = await getProduct((await params).produto);
  if (!product) notFound();

  return (
    <>
      <PageHeader eyebrow="Orçamento online" title={product.name} trail={[{ href: "/orcamento", label: "Orçamento" }]}>
        {product.summary}
      </PageHeader>
      <div className="container-page pb-section">
        <Configurator product={publicProduct(product)} />
      </div>
    </>
  );
}
