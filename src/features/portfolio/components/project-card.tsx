import Link from "next/link";
import { projectClient, type ProjectBase } from "@/lib/domain/content";
import { ProjectVideo } from "./project-video";

/** Cartão de projeto (Home e portfólio): capa com vídeo ao passar o rato, cliente, título, resumo e serviços. */
export function ProjectCard({
  project,
  sizes,
  serviceNames,
}: {
  project: ProjectBase;
  sizes: string;
  serviceNames: Record<string, string>;
}) {
  return (
    <Link href={`/portfolio/${project.slug}`} data-cursor-label="Ver" className="group block space-y-5">
      <div className="aspect-[16/10] overflow-hidden rounded-sm border border-line bg-paper-2">
        <div className="h-full transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]">
          <ProjectVideo poster={project.cover.src} video={project.video} alt={project.cover.alt} sizes={sizes} />
        </div>
      </div>
      <div className="space-y-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 eyebrow text-ink-3">
          <span className="text-ink">{projectClient(project)}</span>
          {project.clientVisible && (
            <>
              <span aria-hidden>·</span>
              {project.sector}
            </>
          )}
        </p>
        <h3 className="text-display-sm font-bold decoration-brand decoration-2 underline-offset-4 group-hover:underline">
          {project.title}
        </h3>
        <p className="text-ink-2">{project.summary}</p>
        <ul className="flex flex-wrap gap-2 pt-1">
          {project.serviceSlugs.map((slug) => (
            <li key={slug} className="rounded-full border border-line px-3 py-1 text-xs text-ink-2">
              {serviceNames[slug]}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
