import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 space-y-3">
      <p className="eyebrow text-brand">{eyebrow}</p>
      <h1 className="text-display-md font-bold">{title}</h1>
      {children && <p className="text-ink-2">{children}</p>}
    </header>
  );
}

export function AuthFormSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 rounded-full" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-14 rounded-full" />
    </div>
  );
}
