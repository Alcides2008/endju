import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SERVICES } from "@/content/services";
import { getService, getServiceNames, getServices } from "@/features/catalog/server";
import { getProjects } from "@/features/content/server";
import { FinalCta } from "@/features/home/components/final-cta";
import { Gallery } from "@/features/portfolio/components/gallery";
import { ProjectCard } from "@/features/portfolio/components/project-card";
import { formatKzWhole } from "@/lib/domain/money";
import { jsonLd, serviceLd } from "@/lib/seo";

// O endereço decide o conteúdo e a resposta 404; com Suspense, um slug inexistente responderia 200.
// Todas as páginas são pré-geradas, por isso a navegação continua rápida sem a validação "instant".
export const instant = false;

export async function generateStaticParams() {
  const slugs = (await getServices()).map((service) => service.slug);
  // Com Cache Components a lista não pode vir vazia: antes de importar o catálogo, usa os serviços iniciais
  return (slugs.length ? slugs : SERVICES.map((s) => s.slug)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/servicos/[slug]">): Promise<Metadata> {
  const service = await getService((await params).slug);
  return service ? { title: service.name, description: service.summary } : {};
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-8 text-display-sm font-bold">{children}</h2>;
}

export default async function ServicePage({ params }: PageProps<"/servicos/[slug]">) {
  const service = await getService((await params).slug);
  if (!service) notFound();

  const [services, serviceNames, allProjects] = await Promise.all([getServices(), getServiceNames(), getProjects()]);
  const index = services.findIndex((s) => s.slug === service.slug);
  const previous = services[(index - 1 + services.length) % services.length];
  const next = services[(index + 1) % services.length];
  const projects = allProjects.filter((project) => project.serviceSlugs.includes(service.slug)).slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(serviceLd(service)) }} />
      <PageHeader
        eyebrow={`Serviço ${String(index + 1).padStart(2, "0")}`}
        title={service.name}
        trail={[{ href: "/servicos", label: "Serviços" }]}
        aside={
          <div className="w-full space-y-5 rounded-sm border border-line bg-card p-6 shadow-paper lg:w-80">
            <p className="text-sm text-ink-3">A partir de</p>
            <p className="-mt-4 text-display-sm font-bold">
              {formatKzWhole(service.priceFrom)}
              <span className="ml-2 text-sm font-normal text-ink-3">{service.unit}</span>
            </p>
            <p className="flex justify-between border-t border-line pt-4 text-sm">
              <span className="text-ink-3">Prazo habitual</span>
              <span className="text-ink">{service.leadTime}</span>
            </p>
            <Button asChild className="w-full">
              <Link href="/orcamento">
                Pedir orçamento <ArrowUpRight aria-hidden />
              </Link>
            </Button>
            <p className="text-xs text-ink-3">
              IVA incluído. O valor final depende de quantidade, material e acabamento.
            </p>
          </div>
        }
      >
        {service.intro}
      </PageHeader>

      <div className="container-page space-y-section pb-section">
        <section aria-labelledby="sobre-servico" className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-5 text-lg text-ink-2">
            <h2 id="sobre-servico" className="sr-only">
              Sobre o serviço
            </h2>
            {service.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div>
            <p className="mb-5 eyebrow text-ink-3">O que fazemos</p>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {service.products.map((product) => (
                <li key={product} className="flex items-center gap-3 border-b border-line py-3.5">
                  <Check className="size-4 shrink-0 text-brand" aria-hidden />
                  {product}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          <section aria-labelledby="especificacoes">
            <SectionTitle>
              <span id="especificacoes">{service.specs.title}</span>
            </SectionTitle>
            <dl className="border-t border-line">
              {service.specs.items.map((item) => (
                <div key={item.name} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
                  <dt className="font-medium text-ink">{item.name}</dt>
                  <dd className="text-ink-2">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="prazos">
            <SectionTitle>
              <span id="prazos">Prazos</span>
            </SectionTitle>
            <table className="w-full text-left text-sm">
              <thead className="eyebrow text-ink-3">
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pr-4 font-normal">
                    Trabalho
                  </th>
                  <th scope="col" className="py-3 pr-4 font-normal">
                    Normal
                  </th>
                  <th scope="col" className="py-3 font-normal">
                    Urgente
                  </th>
                </tr>
              </thead>
              <tbody>
                {service.deadlines.map((row) => (
                  <tr key={row.item} className="border-b border-line">
                    <th scope="row" className="py-4 pr-4 font-medium text-ink">
                      {row.item}
                    </th>
                    <td className="py-4 pr-4 text-ink-2">{row.normal}</td>
                    <td className="py-4 text-ink-2">{row.urgent ?? "Sob consulta"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-ink-3">
              Os prazos contam a partir da aprovação da prova e do pagamento do sinal.
            </p>
          </section>
        </div>

        <section aria-labelledby="galeria">
          <SectionTitle>
            <span id="galeria">Galeria</span>
          </SectionTitle>
          <Gallery images={service.gallery} />
        </section>

        {projects.length > 0 && (
          <section aria-labelledby="projetos">
            <SectionTitle>
              <span id="projetos">Trabalhos com este serviço</span>
            </SectionTitle>
            <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <li key={project.slug} className="reveal">
                  <ProjectCard
                    project={project}
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    serviceNames={serviceNames}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav
          aria-label="Outros serviços"
          className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2"
        >
          {[
            { service: previous, label: "Anterior", Icon: ArrowLeft },
            { service: next, label: "Seguinte", Icon: ArrowRight },
          ].map(({ service: other, label, Icon }) => (
            <Link
              key={label}
              href={`/servicos/${other.slug}`}
              className="group flex items-center justify-between gap-6 bg-card p-6 transition-colors hover:bg-paper-2 sm:last:flex-row-reverse sm:last:text-right"
            >
              <Icon className="size-5 text-ink-3 transition-colors group-hover:text-brand" aria-hidden />
              <span className="space-y-1">
                <span className="block eyebrow text-ink-3">{label}</span>
                <span className="block text-display-sm font-bold">{other.name}</span>
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <FinalCta />
    </>
  );
}
