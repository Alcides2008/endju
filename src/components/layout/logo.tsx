import Image from "next/image";
import { cn } from "@/lib/utils";

/** Marca de registo de impressão (⌖) usada como símbolo gráfico da casa. */
export function RegistrationMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4", className)}>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 1.5v21M1.5 12h21" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * Logótipo oficial (palanca + "endju BUSINESS"). No tema escuro troca para a versão com "BUSINESS" claro.
 * A altura vem da className (h-10 por omissão); a largura acompanha a proporção.
 * shortcut: PNG de 437 px a partir da imagem enviada; trocar pelo SVG/AI original quando existir.
 */
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  const common = { width: 437, height: 259, priority } as const;
  return (
    <span className={cn("relative inline-block h-10 shrink-0", className)}>
      <Image {...common} alt="" src="/brand/endju-logo.png" className="h-full w-auto dark:hidden" />
      <Image {...common} alt="" src="/brand/endju-logo-dark.png" className="hidden h-full w-auto dark:block" />
      <span className="sr-only">ENDJU BUSINESS</span>
    </span>
  );
}
