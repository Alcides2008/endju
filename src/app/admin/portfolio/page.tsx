import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { listProjectDocs } from "@/features/admin/content";
import { ImportContentButton, NewDraftButton } from "@/features/admin/components/content-forms";
import { requireModule } from "@/features/admin/guard";
import { PUBLISH_LABELS, projectClient } from "@/lib/domain/content";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Portfólio" };

export default async function AdminPortfolioPage() {
  const user = await requireModule("portfolio", "view", "/admin/portfolio");
  const projects = await listProjectDocs();
  const published = projects.filter((p) => p.status === "publicado");

  return (
    <>
      <AccountHeading
        title="Portfólio"
        action={
          projects.length > 0 &&
          can(user, "portfolio", "create") && <NewDraftButton kind="projects" label="Novo projeto" />
        }
      >
        {projects.length
          ? `${published.length} publicado(s) · ${projects.length - published.length} rascunho(s) · ${published.filter((p) => p.featured).length} em destaque na Home`
          : "O portfólio ainda está no código do site."}
      </AccountHeading>

      {projects.length === 0 ? (
        <EmptyState
          title="Importa os conteúdos para os poderes editar."
          action={can(user, "cms", "create") ? <ImportContentButton /> : undefined}
        >
          Passa para o Firestore os projetos do portfólio, os artigos do blog, as perguntas frequentes e os testemunhos
          que o site mostra hoje. Até lá, essas páginas ficam vazias.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Projeto</TH>
              <TH>Cliente</TH>
              <TH>Imagens</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {projects.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link href={`/admin/portfolio/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  {p.featured && <p className="text-xs text-ink-3">Destaque na Home</p>}
                </TD>
                <TD className="text-ink-2">{projectClient(p)}</TD>
                <TD className="text-ink-2">
                  {p.cover.src ? 1 + p.gallery.length : "sem capa"}
                  {p.video && " · vídeo"}
                </TD>
                <TD>
                  <Badge tone={p.status === "publicado" ? "success" : "neutral"}>{PUBLISH_LABELS[p.status]}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
