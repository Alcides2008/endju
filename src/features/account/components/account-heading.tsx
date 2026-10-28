import type { ReactNode } from "react";
import Link from "next/link";

/** Título das páginas da área do cliente, com caminho opcional e ação à direita. */
export function AccountHeading({
  title,
  back,
  action,
  children,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 space-y-3">
      {back && (
        <Link href={back.href} className="text-sm text-ink-3 hover:text-ink">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-display-md font-extrabold [font-stretch:85%]">{title}</h1>
        {action}
      </div>
      {children && <div className="max-w-2xl text-ink-2">{children}</div>}
    </header>
  );
}

/** Estado vazio com uma ação para sair dele. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
