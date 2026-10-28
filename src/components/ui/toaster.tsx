"use client";

import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      // Acima dos botões fixos no fundo (Guardar no painel, total no configurador): um aviso nunca tapa o clique seguinte
      offset={{ bottom: 88 }}
      mobileOffset={{ bottom: 88 }}
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-sm border border-line bg-card p-4 text-sm text-ink shadow-lift",
          title: "font-medium",
          description: "text-ink-2",
          actionButton: "ml-auto rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper",
          closeButton: "text-ink-3 hover:text-ink",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-danger",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-info",
        },
      }}
    />
  );
}
