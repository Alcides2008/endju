import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountNav, AccountNavLinks, CUSTOMER_NAV } from "@/components/layout/account-nav";
import { AccountShell } from "@/components/layout/account-shell";

export const metadata: Metadata = { title: "A minha conta", robots: { index: false } };

/**
 * Moldura estática da área do cliente: não lê a sessão, por isso a navegação entre páginas da conta mostra logo
 * o loading.tsx. A sessão é verificada em cada página (requireCustomer) e o proxy barra quem não tem cookie.
 * A navegação lê o endereço: fica em Suspense, com a mesma lista sem destaque enquanto não hidrata.
 */
export default function AccountLayout({ children }: LayoutProps<"/conta">) {
  return (
    <AccountShell
      area="Área do cliente"
      nav={
        <Suspense fallback={<AccountNavLinks items={CUSTOMER_NAV} pathname="" />}>
          <AccountNav items={CUSTOMER_NAV} />
        </Suspense>
      }
    >
      {children}
    </AccountShell>
  );
}
