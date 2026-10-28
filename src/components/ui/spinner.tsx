import { cn } from "@/lib/utils";

export function Spinner({ className, label = "A carregar" }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="status" aria-label={label} className={cn("size-[1.15em] animate-spin", className)}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
