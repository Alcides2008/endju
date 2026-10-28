import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutForm } from "@/features/orders/components/checkout-form";
import { getCommerce } from "@/features/settings/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatPhone } from "@/lib/domain/phone";
import { adminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Concluir encomenda", robots: { index: false } };

// A sessão é lida por pedido; fica dentro de Suspense para o cabeçalho da página ser pré-renderizado
async function CheckoutGate() {
  const user = await requireCustomer("/checkout");
  const profile = (await adminDb().collection("users").doc(user.uid).get()).data();
  const phone = (profile?.phone as string | undefined) ?? user.phone ?? "";
  const commerce = await getCommerce();
  return (
    <CheckoutForm
      zones={commerce.zones.filter((z) => z.active)}
      pickup={commerce.pickupPoints[0]}
      defaults={{
        name: (profile?.displayName as string | undefined) ?? user.name ?? "",
        phone: phone ? formatPhone(phone) : "",
        email: user.email ?? "",
      }}
    />
  );
}

export default function CheckoutPage() {
  return (
    <>
      <PageHeader eyebrow="Checkout" title="Concluir a encomenda." trail={[{ href: "/carrinho", label: "Carrinho" }]} />
      <div className="container-page pb-section">
        <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
          <CheckoutGate />
        </Suspense>
      </div>
    </>
  );
}
