"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const CUSTOMER_NAV = [
  { href: "/conta", label: "Resumo" },
  { href: "/conta/pedidos", label: "Pedidos" },
  { href: "/conta/provas", label: "Provas" },
  { href: "/conta/orcamentos", label: "Orçamentos" },
  { href: "/conta/pagamentos", label: "Pagamentos" },
  { href: "/conta/faturas", label: "Faturas" },
  { href: "/conta/ficheiros", label: "Ficheiros" },
  { href: "/conta/mensagens", label: "Mensagens" },
  { href: "/conta/perfil", label: "Perfil" },
  { href: "/conta/moradas", label: "Moradas" },
  { href: "/conta/notificacoes", label: "Notificações" },
];

/** Ligações da área do cliente: coluna no desktop, faixa deslizante no telemóvel. */
export function AccountNavLinks({ items, pathname }: { items: { href: string; label: string }[]; pathname: string }) {
  return (
    <nav
      aria-label="Área do cliente"
      className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = item.href === "/conta" ? pathname === "/conta" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors lg:rounded-sm",
                  active ? "bg-ink text-paper" : "text-ink-2 hover:bg-ink/[0.06] hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Com a página atual destacada; lê o endereço, por isso fica dentro de Suspense no layout. */
export function AccountNav({ items }: { items: { href: string; label: string }[] }) {
  return <AccountNavLinks items={items} pathname={usePathname()} />;
}
