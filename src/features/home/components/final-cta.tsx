import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { RegistrationMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/content/company";

export function FinalCta() {
  const whatsapp = whatsappLink("Olá Endju, gostava de pedir um orçamento.");
  return (
    <section aria-labelledby="cta-final" className="container-page pb-section">
      <div className="reveal relative overflow-hidden rounded-md bg-brand px-6 py-16 text-brand-fg md:px-16 md:py-24">
        <RegistrationMark className="pointer-events-none absolute -top-24 -right-24 size-[26rem] text-brand-fg/10" />
        <div className="relative max-w-3xl space-y-8">
          <p className="eyebrow text-brand-fg/70">Pronto quando tu estiveres</p>
          <h2 id="cta-final" className="text-display-xl font-extrabold [font-stretch:82%]">
            Tens um projeto em mente? Vamos imprimi-lo.
          </h2>
          <p className="max-w-xl text-lg text-brand-fg/80">
            Configura o produto e vê o preço na hora, ou descreve o trabalho e respondemos no mesmo dia útil.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="ink">
              <Link href="/orcamento">
                Pedir orçamento <ArrowUpRight aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-brand-fg/40 text-brand-fg hover:border-brand-fg hover:bg-brand-fg/10"
            >
              {whatsapp ? (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden /> Falar no WhatsApp
                </a>
              ) : (
                <Link href="/contacto">Falar connosco</Link>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
