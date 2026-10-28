import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { ROLE_LABELS } from "@/lib/domain/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/**
 * Moldura comum de /conta e /admin: barra superior com a sessão e, se houver, a navegação da área.
 * A sidebar do painel (Etapa 6) entra aqui.
 */
export function AccountShell({
  user,
  area,
  nav,
  children,
}: {
  /** Sem `user`, a moldura é estática (a área do cliente valida a sessão em cada página) */
  user?: SessionUser;
  area: string;
  nav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-card">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Ir para o site">
              <Logo />
            </Link>
            <span className="hidden border-l border-line pl-4 eyebrow text-ink-3 sm:inline">{area}</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Badge tone={user.role === "cliente" ? "neutral" : "brand"} className="hidden sm:inline-flex">
                {ROLE_LABELS[user.role]}
              </Badge>
            )}
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      {nav ? (
        <div className="container-page grid flex-1 grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:py-12">
          <div className="lg:sticky lg:top-8 lg:self-start">{nav}</div>
          <main className="min-w-0">{children}</main>
        </div>
      ) : (
        <main className="container-page flex-1 py-10 lg:py-16">{children}</main>
      )}
    </div>
  );
}

export function AccountShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-16 border-b border-line bg-card" />
    </div>
  );
}
