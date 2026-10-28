import type { ReactNode } from "react";
import Link from "next/link";
import { RegistrationMark } from "./logo";

/** Abertura das páginas internas: caminho, eyebrow, título grande e texto de entrada. */
export function PageHeader({
  eyebrow,
  title,
  trail = [],
  children,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  /** Páginas acima desta (a página atual não entra) */
  trail?: { href: string; label: string }[];
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="container-page pt-32 pb-14 lg:pt-44 lg:pb-20">
      {trail.length > 0 && (
        <nav aria-label="Caminho" className="mb-10">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
            {[{ href: "/", label: "Início" }, ...trail].map((item) => (
              <li key={item.href} className="flex items-center gap-2">
                <Link href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
                <span aria-hidden>/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-4xl space-y-6">
          <p className="flex items-center gap-3 eyebrow text-ink-2">
            <RegistrationMark className="text-brand" />
            {eyebrow}
          </p>
          <h1 className="text-display-xl font-extrabold [font-stretch:82%]">{title}</h1>
          {children && <div className="max-w-2xl text-lg text-ink-2">{children}</div>}
        </div>
        {aside}
      </div>
    </header>
  );
}
