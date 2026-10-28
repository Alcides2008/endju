"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { Copy, X } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { pathMatches, popupDue } from "@/lib/domain/marketing";
import type { SitePopup } from "../server";
import { trackPopup } from "../actions";

const SEEN = "endju:popups-vistos";

function readSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Mostra no máximo um pop-up por visita: o mais recente que serve para esta página e que a pessoa não viu
 * nos últimos dias escolhidos. Não aparece na área de cliente nem no checkout.
 */
export function PopupHost({ popups }: { popups: SitePopup[] }) {
  const pathname = usePathname();
  const [popup, setPopup] = useState<SitePopup | null>(null);

  useEffect(() => {
    if (/^\/(checkout|carrinho|entrar|registar)/.test(pathname)) return;
    const seen = readSeen();
    const candidate = popups.find(
      (p) => pathMatches(p.paths, pathname) && popupDue(seen[p.id] ?? null, p.frequencyDays, Date.now()),
    );
    if (!candidate) return;
    const show = () => {
      setPopup(candidate);
      try {
        localStorage.setItem(SEEN, JSON.stringify({ ...readSeen(), [candidate.id]: Date.now() }));
      } catch {}
      void trackPopup(candidate.id, "view");
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && (window.scrollY / max) * 100 >= candidate.scrollPct) show();
    };
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };
    const timer = candidate.trigger === "tempo" ? window.setTimeout(show, candidate.delaySec * 1000) : undefined;
    if (candidate.trigger === "scroll") window.addEventListener("scroll", onScroll, { passive: true });
    if (candidate.trigger === "saida") document.addEventListener("mouseout", onLeave);
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onLeave);
    }
    return cleanup;
  }, [pathname, popups]);

  if (!popup) return null;
  return (
    <Dialog.Root open onOpenChange={(open) => !open && setPopup(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-md bg-card p-7 shadow-lift outline-none data-[state=open]:animate-pop-in sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2">
          <Dialog.Close
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink"
            aria-label="Fechar"
          >
            <X className="size-4" aria-hidden />
          </Dialog.Close>
          <Dialog.Title className="pr-8 text-display-sm font-bold">{popup.title}</Dialog.Title>
          {popup.body && <Dialog.Description className="mt-3 text-ink-2">{popup.body}</Dialog.Description>}
          {popup.couponCode && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(popup.couponCode!);
                toast.success(`Código ${popup.couponCode} copiado: usa-o no checkout.`);
                void trackPopup(popup.id, "conversion");
              }}
              className="mt-5 flex w-full items-center justify-between rounded-sm border-2 border-dashed border-brand px-4 py-3 font-mono text-lg font-semibold tracking-wider text-ink"
            >
              {popup.couponCode}
              <Copy className="size-4 text-ink-3" aria-label="Copiar código" />
            </button>
          )}
          {popup.cta && (
            <Link
              href={popup.cta.href}
              onClick={() => {
                void trackPopup(popup.id, "conversion");
                setPopup(null);
              }}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-brand px-6 font-medium text-brand-fg hover:bg-brand-strong"
            >
              {popup.cta.label}
            </Link>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
