import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Tabela base. A tabela avançada do painel (TanStack) assenta nestas peças na Etapa 6. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-sm border border-line bg-card">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead(props: ComponentProps<"thead">) {
  return <thead className="border-b border-line bg-paper-2/60" {...props} />;
}

export function TBody(props: ComponentProps<"tbody">) {
  return <tbody className="divide-y divide-line" {...props} />;
}

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-ink/[0.025]", className)} {...props} />;
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "h-11 px-4 font-mono text-[0.6875rem] font-medium tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("h-14 px-4 whitespace-nowrap text-ink", className)} {...props} />;
}
