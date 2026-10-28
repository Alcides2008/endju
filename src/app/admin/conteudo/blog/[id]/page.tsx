import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { getPostDoc } from "@/features/admin/content";
import { ContentStatusActions, PostForm } from "@/features/admin/components/content-forms";
import { requireModule } from "@/features/admin/guard";
import { PUBLISH_LABELS } from "@/lib/domain/content";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Artigo" };

export default async function AdminPostPage({ params }: PageProps<"/admin/conteudo/blog/[id]">) {
  const user = await requireModule("cms", "view", "/admin/conteudo/blog");
  const post = await getPostDoc((await params).id);
  if (!post) notFound();
  const canPublish = can(user, "cms", "approve");

  return (
    <div className="max-w-4xl">
      <Link href="/admin/conteudo/blog" className="text-sm text-ink-2 hover:text-ink">
        ← Blog
      </Link>
      <AccountHeading
        title={post.title}
        action={
          <ContentStatusActions
            kind="posts"
            id={post.id}
            status={post.status}
            canPublish={canPublish}
            canDelete={can(user, "cms", "delete")}
          />
        }
      >
        <Badge tone={post.status === "publicado" ? "success" : "neutral"}>{PUBLISH_LABELS[post.status]}</Badge>{" "}
        {post.status === "publicado" ? (
          <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-ink-2 hover:text-ink">
            Ver no site ↗
          </Link>
        ) : (
          !canPublish && <span className="text-sm text-ink-3">Guarda o rascunho; o Gestor publica.</span>
        )}
      </AccountHeading>
      <PostForm post={post} canEdit={can(user, "cms", "edit")} canPublish={canPublish} />
    </div>
  );
}
