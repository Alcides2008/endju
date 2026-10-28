import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { POSTS } from "@/content/blog";
import { getPost, getPosts } from "@/features/content/server";
import { formatPostDate, readingMinutes, type PostBlock } from "@/lib/domain/content";
import { FinalCta } from "@/features/home/components/final-cta";

// O endereço decide o conteúdo e a resposta 404; com Suspense, um slug inexistente responderia 200.
// Todas as páginas são pré-geradas, por isso a navegação continua rápida sem a validação "instant".
export const instant = false;

export async function generateStaticParams() {
  const slugs = (await getPosts()).map((post) => post.slug);
  // Com Cache Components a lista não pode vir vazia: antes de importar os conteúdos, usa os artigos iniciais
  return (slugs.length ? slugs : POSTS.map((p) => p.slug)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post
    ? {
        title: post.title,
        description: post.excerpt,
        openGraph: { type: "article", publishedTime: post.publishedAt, images: [post.cover.src.src] },
      }
    : {};
}

function Block({ block }: { block: PostBlock }) {
  switch (block.type) {
    case "h2":
      return <h2>{block.text}</h2>;
    case "ul":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <aside className="flex gap-4 rounded-sm border-l-4 border-brand bg-card p-6 text-ink">
          <Lightbulb className="mt-1 size-5 shrink-0 text-brand" aria-hidden />
          <p>{block.text}</p>
        </aside>
      );
    default:
      return <p>{block.text}</p>;
  }
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const others = (await getPosts()).filter((other) => other.slug !== post.slug).slice(0, 2);

  return (
    <>
      <PageHeader eyebrow={post.tags.join(" · ")} title={post.title} trail={[{ href: "/blog", label: "Blog" }]}>
        <p>{post.excerpt}</p>
        <p className="mt-6 text-sm text-ink-3">
          {post.author} · <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time> ·{" "}
          {readingMinutes(post)} min de leitura
        </p>
      </PageHeader>

      <article className="container-page pb-section">
        <div className="relative mb-16 aspect-[21/9] overflow-hidden rounded-sm border border-line">
          <Image
            src={post.cover.src}
            alt={post.cover.alt}
            fill
            placeholder="blur"
            preload
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="mx-auto prose-endju max-w-2xl">
          {post.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>

      <section aria-labelledby="mais-artigos" className="container-page pb-section">
        <h2 id="mais-artigos" className="mb-8 eyebrow text-ink-3">
          Mais da oficina
        </h2>
        <ul className="grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link href={`/blog/${other.slug}`} className="group block h-full space-y-3 bg-card p-8 hover:bg-paper-2">
                <p className="eyebrow text-ink-3">{other.tags[0]}</p>
                <p className="text-display-sm font-bold group-hover:text-brand">{other.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <FinalCta />
    </>
  );
}
