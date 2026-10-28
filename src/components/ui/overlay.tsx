"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type OverlayProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Elemento que abre (opcional se o estado for controlado). */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

function Header({ title, description }: Pick<OverlayProps, "title" | "description">) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="space-y-1.5">
        <Dialog.Title className="font-display text-2xl leading-tight font-semibold tracking-tight text-ink">
          {title}
        </Dialog.Title>
        {description ? (
          <Dialog.Description className="text-sm text-ink-2">{description}</Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
        )}
      </div>
      <Dialog.Close
        className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-ink/[0.06] hover:text-ink focus-visible:ring-4 focus-visible:ring-brand/30 focus-visible:outline-none"
        aria-label="Fechar"
      >
        <X className="size-5" />
      </Dialog.Close>
    </div>
  );
}

const backdrop =
  "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in";

/** Janela modal centrada. Em ecrãs pequenos encosta ao fundo, como uma folha. */
export function Modal({ open, onOpenChange, trigger, title, description, children, footer, className }: OverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={backdrop} />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col gap-6 overflow-y-auto rounded-t-lg bg-card p-6 shadow-lift outline-none",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(36rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md sm:p-8",
            "sm:data-[state=closed]:animate-pop-out sm:data-[state=open]:animate-pop-in",
            className,
          )}
        >
          <Header title={title} description={description} />
          {children}
          {footer && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Painel lateral (direita) para detalhes e filtros; no telemóvel ocupa a largura toda. */
export function Drawer({ open, onOpenChange, trigger, title, description, children, footer, className }: OverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className={backdrop} />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-card shadow-lift outline-none sm:w-[min(30rem,100vw)]",
            "data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in",
            className,
          )}
        >
          <div className="border-b border-line p-6">
            <Header title={title} description={description} />
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {footer && <div className="flex gap-3 border-t border-line p-6">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
