import { getServiceNames } from "@/features/catalog/server";
import { getProjects } from "@/features/content/server";
import { ProjectCard } from "@/features/portfolio/components/project-card";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

// Grelha em ziguezague: largo-estreito / estreito-largo
const SPANS = ["lg:col-span-7", "lg:col-span-5 lg:mt-24", "lg:col-span-5", "lg:col-span-7 lg:-mt-24"];

export async function PortfolioSection() {
  const [serviceNames, projects] = await Promise.all([getServiceNames(), getProjects()]);
  const featured = projects.filter((p) => p.featured);
  if (featured.length === 0) return null;
  return (
    <section aria-labelledby="portfolio" className="container-page py-section">
      <SectionHeading
        index="02"
        eyebrow="Portfólio"
        title={<span id="portfolio">Trabalhos que saíram da nossa oficina.</span>}
        action={{ href: "/portfolio", label: "Ver o portfólio completo" }}
      />
      <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-12">
        {featured.slice(0, 4).map((project, i) => (
          <li key={project.slug} className={cn("reveal", SPANS[i])}>
            <ProjectCard
              project={project}
              sizes="(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw"
              serviceNames={serviceNames}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
