import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { getServiceNames } from "@/features/catalog/server";
import { getProjects } from "@/features/content/server";
import { FinalCta } from "@/features/home/components/final-cta";
import { PortfolioGrid } from "@/features/portfolio/components/portfolio-grid";

export const metadata: Metadata = {
  title: "Portfólio",
  description:
    "Letras 3D, letreiros luminosos, outdoors, envelopamento de viaturas, fardamento e brindes produzidos e montados pela Endju em Luanda.",
};

export default async function PortfolioPage() {
  return (
    <>
      <PageHeader eyebrow="Portfólio" title="Trabalhos reais, filmados na oficina e na rua.">
        Cada projeto mostra o que fizemos, como o fizemos e o resultado. Passa o rato pelas imagens para ver o vídeo.
      </PageHeader>
      <section aria-label="Trabalhos" className="container-page pb-section">
        <PortfolioGrid projects={await getProjects()} serviceNames={await getServiceNames()} />
      </section>
      <FinalCta />
    </>
  );
}
