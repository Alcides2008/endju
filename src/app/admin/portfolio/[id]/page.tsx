import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { getProjectDoc } from "@/features/admin/content";
import { ContentStatusActions, ProjectForm } from "@/features/admin/components/content-forms";
import { requireModule } from "@/features/admin/guard";
import { getServices } from "@/features/catalog/server";
import { PUBLISH_LABELS } from "@/lib/domain/content";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Projeto" };

export default async function AdminProjectPage({ params }: PageProps<"/admin/portfolio/[id]">) {
  const user = await requireModule("portfolio", "view", "/admin/portfolio");
  const [project, services] = await Promise.all([getProjectDoc((await params).id), getServices()]);
  if (!project) notFound();
  const canPublish = can(user, "portfolio", "approve");

  return (
    <div className="max-w-4xl">
      <Link href="/admin/portfolio" className="text-sm text-ink-2 hover:text-ink">
        ← Portfólio
      </Link>
      <AccountHeading
        title={project.title}
        action={
          <ContentStatusActions
            kind="projects"
            id={project.id}
            status={project.status}
            canPublish={canPublish}
            canDelete={can(user, "portfolio", "delete")}
          />
        }
      >
        <Badge tone={project.status === "publicado" ? "success" : "neutral"}>{PUBLISH_LABELS[project.status]}</Badge>{" "}
        {project.status === "publicado" ? (
          <Link href={`/portfolio/${project.slug}`} target="_blank" className="text-sm text-ink-2 hover:text-ink">
            Ver no site ↗
          </Link>
        ) : (
          !canPublish && <span className="text-sm text-ink-3">Guarda o rascunho; o Gestor publica.</span>
        )}
      </AccountHeading>
      <ProjectForm
        project={project}
        services={services.map((s) => ({ slug: s.slug, name: s.name }))}
        canEdit={can(user, "portfolio", "edit")}
        canPublish={canPublish}
      />
    </div>
  );
}
