import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { CartView } from "@/features/cart/components/cart-view";
import { getProducts } from "@/features/catalog/server";
import { publicProduct } from "@/lib/domain/catalog";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default async function CartPage() {
  const products = (await getProducts()).map(publicProduct);
  return (
    <>
      <PageHeader eyebrow="Carrinho" title="O teu pedido." />
      <div className="container-page pb-section">
        <CartView products={products} />
      </div>
    </>
  );
}
