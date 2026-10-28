"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { ArrowUpRight, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useCart } from "@/features/cart/store";
import { TopBar } from "@/features/content/components/banners";
import type { Banner } from "@/lib/domain/content";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { SITE_NAV } from "./nav";
import { ThemeToggle } from "./theme-toggle";

function AccountLink({ className }: { className?: string }) {
  const user = useAuthUser();
  return (
    <Link
      href={user ? "/conta" : "/entrar"}
      data-cursor="hover"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink transition hover:bg-ink/[0.06]",
        className,
      )}
    >
      <UserRound className="size-[1.125rem]" aria-hidden />
      {user ? "A minha conta" : "Entrar"}
    </Link>
  );
}

function CartLink() {
  const count = useCart().length;
  return (
    <Link
      href="/carrinho"
      aria-label={count ? `Carrinho, ${count} ${count === 1 ? "produto" : "produtos"}` : "Carrinho"}
      data-cursor="hover"
      className="relative grid size-10 place-items-center rounded-full text-ink transition hover:bg-ink/[0.06]"
    >
      <ShoppingBag className="size-[1.125rem]" aria-hidden />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 grid min-w-4.5 place-items-center rounded-full bg-brand px-1 font-mono text-[0.625rem] leading-[1.125rem] text-brand-fg">
          {count}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({ banners = [] }: { banners?: Banner[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-500",
        scrolled && "bg-paper/90 shadow-[0_1px_0_var(--line)] backdrop-blur-md",
      )}
    >
      <TopBar banners={banners} collapsed={scrolled} />
      <div className="container-page flex h-16 items-center justify-between gap-6 lg:h-20">
        <Link href="/" aria-label="ENDJU BUSINESS, página inicial" data-cursor="hover">
          <Logo priority />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {SITE_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-3 py-2 text-[0.9375rem] font-medium whitespace-nowrap text-ink-2 transition-colors hover:text-ink xl:px-4",
                      "after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-500 after:ease-out-expo hover:after:scale-x-100 xl:after:inset-x-4",
                      active && "text-ink after:scale-x-100",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <CartLink />
          <AccountLink className="hidden sm:inline-flex" />
          <Button asChild size="sm" className="ml-2 hidden md:inline-flex">
            <Link href="/orcamento">
              Pedir orçamento <ArrowUpRight aria-hidden />
            </Link>
          </Button>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
              className="grid size-10 place-items-center rounded-full text-ink hover:bg-ink/[0.06] lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-paper data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in">
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                <Dialog.Description className="sr-only">Navegação principal do site</Dialog.Description>
                <div className="container-page flex h-16 items-center justify-between">
                  <Logo />
                  <Dialog.Close
                    className="grid size-10 place-items-center rounded-full hover:bg-ink/[0.06]"
                    aria-label="Fechar menu"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <nav aria-label="Principal" className="container-page flex-1 overflow-y-auto pt-8">
                  <ol className="divide-y divide-line border-y border-line">
                    {SITE_NAV.map((item, index) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-baseline gap-4 py-5 font-display text-display-sm font-semibold text-ink"
                        >
                          <span className="eyebrow text-ink-3">{String(index + 1).padStart(2, "0")}</span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </nav>
                <div className="container-page flex flex-col gap-3 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <Button asChild size="lg">
                    <Link href="/orcamento" onClick={() => setOpen(false)}>
                      Pedir orçamento <ArrowUpRight aria-hidden />
                    </Link>
                  </Button>
                  <AccountLink className="justify-center" />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
