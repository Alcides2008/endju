import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { listPostDocs } from "@/features/admin/content";
import { ImportContentButton, NewDraftButton } from "@/features/admin/components/content-forms";
import { CONTENT_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { formatPostDate, PUBLISH_LABELS, readingMinutes } from "@/lib/domain/content";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const user = await requireModule("cms", "view", "/admin/conteudo/blog");
  const posts = await listPostDocs();

  return (
    <>
      <AccountHeading
        title="Conteúdo"
        action={posts.length > 0 && can(user, "cms", "create") && <NewDraftButton kind="posts" label="Novo artigo" />}
      >
        Artigos do blog, perguntas frequentes, testemunhos da Home e banners do site.
      </AccountHeading>
      <SectionTabs tabs={CONTENT_TABS} current="/admin/conteudo/blog" />
      {posts.length === 0 ? (
        <EmptyState
          title="Importa os conteúdos para os poderes editar."
          action={can(user, "cms", "create") ? <ImportContentButton /> : undefined}
        >
          Passa para o Firestore os artigos, as perguntas frequentes, os testemunhos e o portfólio que o site mostra
          hoje.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Artigo</TH>
              <TH>Data</TH>
              <TH>Leitura</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {posts.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link href={`/admin/conteudo/blog/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  <p className="text-xs text-ink-3">{p.author}</p>
                </TD>
                <TD className="whitespace-nowrap text-ink-2">{formatPostDate(p.publishedAt)}</TD>
                <TD className="text-ink-2">{readingMinutes(p)} min</TD>
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
