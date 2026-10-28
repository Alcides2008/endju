import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PROJECTS } from "@/content/portfolio";
import { getServiceNames } from "@/features/catalog/server";
import { getProject, getProjects } from "@/features/content/server";
import { projectClient } from "@/lib/domain/content";
import { FinalCta } from "@/features/home/components/final-cta";
import { BeforeAfter } from "@/features/portfolio/components/before-after";
import { Gallery } from "@/features/portfolio/components/gallery";

// O endereço decide o conteúdo e a resposta 404; com Suspense, um slug inexistente responderia 200.
// Todas as páginas são pré-geradas, por isso a navegação continua rápida sem a validação "instant".
export const instant = false;

export async function generateStaticParams() {
  const slugs = (await getProjects()).map((project) => project.slug);
  // Com Cache Components a lista não pode vir vazia: antes de importar os conteúdos, usa os projetos iniciais
  return (slugs.length ? slugs : PROJECTS.map((p) => p.slug)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/portfolio/[slug]">): Promise<Metadata> {
  const project = await getProject((await params).slug);
  return project
    ? {
        title: `${project.title} · ${projectClient(project)}`,
        description: project.summary,
        openGraph: { images: [project.cover.src.src] },
      }
    : {};
}

export default async function ProjectPage({ params }: PageProps<"/portfolio/[slug]">) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  const [serviceNames, projects] = await Promise.all([getServiceNames(), getProjects()]);

  const index = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(index + 1) % projects.length];
  const story = [
    { title: "Desafio", text: project.challenge },
    { title: "Solução", text: project.solution },
    { title: "Resultado", text: project.result },
  ];

  return (
    <>
      <PageHeader
        eyebrow={project.clientVisible ? `${project.clientName} · ${project.sector}` : project.sector}
        title={project.title}
        trail={[{ href: "/portfolio", label: "Portfólio" }]}
        aside={
          <ul className="flex flex-wrap gap-2 lg:max-w-72 lg:justify-end">
            {project.serviceSlugs.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/servicos/${slug}`}
                  className="inline-block rounded-full border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:border-ink hover:text-ink"
                >
                  {serviceNames[slug]}
                </Link>
              </li>
            ))}
          </ul>
        }
      >
        {project.summary}.
      </PageHeader>

      <div className="container-page space-y-section pb-section">
        <figure className="overflow-hidden rounded-sm border border-line bg-ink">
          {project.video ? (
            <video
              src={project.video.src}
              poster={project.cover.src.src}
              controls
              playsInline
              preload="none"
              className="mx-auto max-h-[80svh] w-full object-contain"
            />
          ) : (
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              sizes="100vw"
              className="mx-auto max-h-[80svh] w-auto object-contain"
            />
          )}
          <figcaption className="sr-only">{project.cover.alt}</figcaption>
        </figure>

        <section aria-label="O projeto" className="grid gap-12 md:grid-cols-3 md:gap-10">
          {story.map((part, i) => (
            <div key={part.title} className="reveal space-y-4 border-t border-ink pt-6">
              <h2 className="flex items-baseline gap-3 text-display-sm font-bold">
                <span className="font-mono text-xs font-normal text-brand">{String(i + 1).padStart(2, "0")}</span>
                {part.title}
              </h2>
              <p className="text-ink-2">{part.text}</p>
            </div>
          ))}
        </section>

        {project.beforeAfter && (
          <section aria-labelledby="antes-depois">
            <h2 id="antes-depois" className="mb-8 text-display-sm font-bold">
              Antes e depois
            </h2>
            <BeforeAfter pair={project.beforeAfter} />
          </section>
        )}

        {project.gallery.length > 0 && (
          <section aria-labelledby="galeria">
            <h2 id="galeria" className="mb-8 text-display-sm font-bold">
              Galeria
            </h2>
            <Gallery images={project.gallery} />
          </section>
        )}

        <Link
          href={`/portfolio/${next.slug}`}
          className="group flex flex-col gap-4 border-y border-line py-10 md:flex-row md:items-center md:justify-between"
        >
          <span className="space-y-2">
            <span className="block eyebrow text-ink-3">Trabalho seguinte · {projectClient(next)}</span>
            <span className="block text-display-md font-extrabold [font-stretch:85%] transition-colors group-hover:text-brand">
              {next.title}
            </span>
          </span>
          <ArrowRight
            className="size-8 shrink-0 text-ink-3 transition-[color,translate] duration-500 group-hover:translate-x-2 group-hover:text-brand"
            aria-hidden
          />
        </Link>
      </div>

      <FinalCta />
    </>
  );
}
