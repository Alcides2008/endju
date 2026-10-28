import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Cabeçalho comum das secções: número + eyebrow, título grande e ligação opcional. */
export function SectionHeading({
  index,
  eyebrow,
  title,
  action,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <header className="reveal mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-5">
        <p className="flex items-center gap-3 eyebrow text-ink-3">
          <span className="text-brand">{index}</span>
          {eyebrow}
        </p>
        <h2 className="text-display-lg font-extrabold [font-stretch:85%]">{title}</h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-ink underline decoration-brand decoration-2 underline-offset-[6px]"
        >
          {action.label}
          <ArrowUpRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      )}
    </header>
  );
}
