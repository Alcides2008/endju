import { cn } from "@/lib/utils";

/** Bloco de carregamento com brilho a passar, como luz sobre papel. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-xs bg-ink/[0.07]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-linear-to-r after:from-transparent after:via-paper/60 after:to-transparent",
        className,
      )}
    />
  );
}
