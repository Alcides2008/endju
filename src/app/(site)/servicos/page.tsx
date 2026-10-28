import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getServices } from "@/features/catalog/server";
import { FinalCta } from "@/features/home/components/final-cta";
import { formatKzWhole } from "@/lib/domain/money";

export const metadata: Metadata = {
  title: "Serviços",
  description:
    "Impressão digital, grande formato, design, branding, papelaria, brindes, sinalética, embalagens e fardamento em Luanda, com preços a partir de e prazos claros.",
};

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <>
      <PageHeader eyebrow="Serviços" title="Nove ofícios, uma só oficina.">
        Do ficheiro ao produto montado: design, impressão, acabamento e instalação sem passar por terceiros. Preços com
        IVA incluído.
      </PageHeader>

      <section aria-label="Lista de serviços" className="container-page pb-section">
        <ol className="border-t border-line">
          {services.map((service, i) => (
            <li key={service.slug} className="reveal border-b border-line">
              <Link
                href={`/servicos/${service.slug}`}
                data-cursor-label="Ver"
                className="group grid items-center gap-6 py-8 md:grid-cols-[3rem_minmax(0,1fr)_14rem] md:gap-10 lg:grid-cols-[3rem_minmax(0,1.2fr)_minmax(0,1fr)_14rem] lg:py-10"
              >
                <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <div className="space-y-3">
                  <h2 className="text-display-md font-extrabold [font-stretch:85%] transition-colors group-hover:text-brand">
                    {service.name}
                  </h2>
                  <p className="max-w-xl text-ink-2">{service.summary}</p>
                </div>
                <dl className="hidden gap-2 text-sm lg:grid">
                  <div className="flex gap-2">
                    <dt className="text-ink-3">A partir de</dt>
                    <dd className="font-semibold text-ink">
                      {formatKzWhole(service.priceFrom)} <span className="font-normal text-ink-3">{service.unit}</span>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-ink-3">Prazo</dt>
                    <dd className="text-ink">{service.leadTime}</dd>
                  </div>
                </dl>
                <div className="relative hidden aspect-[4/3] overflow-hidden rounded-sm border border-line md:block">
                  <Image
                    src={service.gallery[0].src}
                    alt=""
                    fill
                    sizes="14rem"
                    className="object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-105"
                  />
                  <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-paper text-ink transition-colors group-hover:bg-brand group-hover:text-brand-fg">
                    <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <FinalCta />
    </>
  );
}
