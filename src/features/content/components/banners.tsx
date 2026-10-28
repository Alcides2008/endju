"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { bannerLive, type Banner } from "@/lib/domain/content";
import { cn } from "@/lib/utils";

const DISMISSED = "endju:banners-fechados";

/** O banner do dia: as datas comparam-se no browser, porque a página está em cache. */
function useLiveBanner(banners: Banner[], dismissible: boolean) {
  const [banner, setBanner] = useState<Banner | null>(null);
  useEffect(() => {
    let closed: string[] = [];
    try {
      closed = dismissible ? JSON.parse(localStorage.getItem(DISMISSED) ?? "[]") : [];
    } catch {}
    // Atualizado depois de montar: a data e o localStorage só existem no browser
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBanner(banners.find((b) => bannerLive(b) && !closed.includes(b.id)) ?? null);
  }, [banners, dismissible]);
  const dismiss = () => {
    if (!banner) return;
    try {
      const closed: string[] = JSON.parse(localStorage.getItem(DISMISSED) ?? "[]");
      localStorage.setItem(DISMISSED, JSON.stringify([...closed, banner.id].slice(-20)));
    } catch {}
    setBanner(null);
  };
  return { banner, dismiss };
}

function Cta({ cta, className }: { cta: NonNullable<Banner["cta"]>; className?: string }) {
  const external = /^https?:\/\//.test(cta.href);
  return (
    <Link
      href={cta.href}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
      className={cn("inline-flex items-center gap-1 font-medium underline underline-offset-4", className)}
    >
      {cta.label} <ArrowUpRight className="size-3.5" aria-hidden />
    </Link>
  );
}

/** Barra fina no topo de todas as páginas, dentro do cabeçalho fixo; encolhe ao descer a página. */
export function TopBar({ banners, collapsed }: { banners: Banner[]; collapsed: boolean }) {
  const { banner, dismiss } = useLiveBanner(banners, true);
  if (!banner) return null;
  return (
    <div
      className={cn(
        "grid bg-ink text-paper transition-[grid-template-rows] duration-300",
        collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className="container-page flex min-h-9 items-center justify-center gap-x-3 gap-y-1 py-1.5 text-center text-xs sm:text-sm">
          <p className="flex flex-wrap items-center justify-center gap-x-3">
            <strong className="font-semibold">{banner.title}</strong>
            {banner.body && <span className="text-paper/75">{banner.body}</span>}
            {banner.cta && <Cta cta={banner.cta} />}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="grid size-7 shrink-0 place-items-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper"
            aria-label="Fechar aviso"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Faixa da Home, a seguir à abertura: campanhas e avisos com mais texto. */
export function HomeStrip({ banners }: { banners: Banner[] }) {
  const { banner } = useLiveBanner(banners, false);
  if (!banner) return null;
  return (
    <section aria-label="Destaque" className="container-page pt-section">
      <div className="flex flex-col gap-5 rounded-md bg-brand px-6 py-8 text-brand-fg md:flex-row md:items-center md:justify-between md:px-10">
        <div className="space-y-2">
          <p className="text-display-sm font-bold">{banner.title}</p>
          {banner.body && <p className="max-w-2xl opacity-85">{banner.body}</p>}
        </div>
        {banner.cta && <Cta cta={banner.cta} className="shrink-0 text-base" />}
      </div>
    </section>
  );
}
