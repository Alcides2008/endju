import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getServices } from "@/features/catalog/server";
import { formatKzWhole } from "@/lib/domain/money";
import { SectionHeading } from "./section-heading";

// Cada cartão "imprime" com uma cor de processo diferente ao passar o rato
const ACCENTS = ["bg-process-cyan", "bg-process-magenta", "bg-process-yellow"];

export async function ServicesSection() {
  const services = await getServices();
  return (
    <section aria-labelledby="servicos" className="container-page py-section">
      <SectionHeading
        index="01"
        eyebrow="Serviços"
        title={<span id="servicos">Tudo o que a tua marca imprime, sob o mesmo teto.</span>}
        action={{ href: "/servicos", label: "Ver todos os serviços" }}
      />
      <ul className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => (
          <li key={service.slug} className="reveal">
            <Link
              href={`/servicos/${service.slug}`}
              data-cursor-label="Ver"
              className="group relative flex h-full flex-col justify-between gap-8 overflow-hidden bg-card p-6 transition-colors duration-500 hover:bg-ink focus-visible:bg-ink sm:min-h-[19rem] sm:gap-10 md:p-8"
            >
              {/* Barra de cor que cresce do canto, como tinta a entrar no papel */}
              <span
                aria-hidden
                className={`absolute top-0 left-0 h-1 w-full origin-left scale-x-0 transition-transform duration-700 ease-out-expo group-hover:scale-x-100 ${ACCENTS[i % 3]}`}
              />
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs text-ink-3 transition-colors group-hover:text-paper/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="size-5 text-ink-3 transition-[color,translate] duration-500 ease-out-expo group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-brand"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-display-sm font-bold text-ink transition-colors group-hover:text-paper">
                  {service.name}
                </h3>
                <p className="text-sm text-ink-2 transition-colors group-hover:text-paper/70">{service.summary}</p>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-4 transition-colors group-hover:border-paper/15">
                  <p className="text-sm text-ink transition-colors group-hover:text-paper">
                    <span className="text-ink-3 group-hover:text-paper/60">a partir de </span>
                    <strong className="font-semibold">{formatKzWhole(service.priceFrom)}</strong>
                    <span className="text-ink-3 group-hover:text-paper/60"> {service.unit}</span>
                  </p>
                  <span className="eyebrow text-ink-3 group-hover:text-paper/60">{service.leadTime}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-3">
        Preços com IVA incluído. O valor final depende de quantidade, papel e acabamento.
      </p>
    </section>
  );
}
