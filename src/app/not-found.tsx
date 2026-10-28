import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RegistrationMark } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada", robots: { index: false } };

// As três chapas de cor (C, M, Y) desalinhadas, como uma impressão fora de registo, e o preto por cima
const PLATES = [
  { color: "text-process-cyan", offset: "-translate-x-[0.06em] -translate-y-[0.03em]", delay: "0s" },
  { color: "text-process-magenta", offset: "translate-x-[0.05em] translate-y-[0.02em]", delay: "0.15s" },
  { color: "text-process-yellow", offset: "translate-x-[0.02em] -translate-y-[0.05em]", delay: "0.3s" },
];

const LINKS = [
  { href: "/servicos", label: "Serviços" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/orcamento", label: "Orçamento online" },
  { href: "/contacto", label: "Contacto" },
];

export default function NotFound() {
  return (
    <div className="paper-grain flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="conteudo" className="container-page flex flex-1 flex-col justify-center pt-28 pb-20">
        <div className="relative w-fit select-none" aria-hidden>
          {/* Marcas de corte nos cantos da "folha" */}
          {[
            "-top-6 -left-6 border-t border-l",
            "-top-6 -right-6 border-t border-r",
            "-bottom-6 -left-6 border-b border-l",
            "-right-6 -bottom-6 border-r border-b",
          ].map((corner) => (
            <span key={corner} className={`absolute size-6 border-ink/40 ${corner}`} />
          ))}
          <RegistrationMark className="absolute -top-14 left-1/2 size-6 -translate-x-1/2 text-ink/40" />
          <div className="relative font-display text-[clamp(9rem,40vw,30rem)] leading-[0.8] font-extrabold tracking-[-0.06em] [font-stretch:75%]">
            {PLATES.map((plate) => (
              <span
                key={plate.color}
                style={{ animationDelay: plate.delay }}
                className={`absolute inset-0 mix-blend-multiply motion-safe:animate-[registo_4s_var(--ease-in-out-quart)_infinite] dark:mix-blend-screen ${plate.color} ${plate.offset}`}
              >
                404
              </span>
            ))}
            <span className="relative text-ink/90 mix-blend-multiply dark:mix-blend-screen">404</span>
          </div>
        </div>

        <div className="mt-16 max-w-xl space-y-6">
          <p className="eyebrow text-brand">Erro 404 · fora de registo</p>
          <h1 className="text-display-lg font-extrabold [font-stretch:85%]">Esta página saiu fora de registo.</h1>
          <p className="text-lg text-ink-2">
            Na gráfica, quando as cores não coincidem, diz-se que a impressão está fora de registo. Aqui foi a página
            que não encontrámos: pode ter mudado de endereço ou nunca ter existido.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/">
                Voltar ao início <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="underline decoration-brand decoration-2 underline-offset-4 hover:text-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
