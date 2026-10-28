import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getPosts } from "@/features/content/server";
import { formatPostDate, readingMinutes } from "@/lib/domain/content";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guias práticos sobre ficheiros para impressão, grande formato, letreiros e fardamento, escritos pela oficina da Endju.",
};

export default async function BlogPage() {
  const [first, ...rest] = await getPosts();
  const header = (
    <PageHeader eyebrow="Blog" title="Notas da oficina.">
      Guias práticos para acertares no material, no ficheiro e na técnica antes de encomendar.
    </PageHeader>
  );
  if (!first) {
    return (
      <>
        {header}
        <p className="container-page pb-section text-ink-2">Os primeiros artigos estão a ser escritos.</p>
      </>
    );
  }
  return (
    <>
      {header}

      <div className="container-page space-y-20 pb-section">
        <Link href={`/blog/${first.slug}`} className="group grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-line">
            <Image
              src={first.cover.src}
              alt={first.cover.alt}
              fill
              placeholder="blur"
              preload
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]"
            />
          </div>
          <div className="space-y-5">
            <p className="eyebrow text-ink-3">
              {first.tags[0]} · {readingMinutes(first)} min de leitura
            </p>
            <h2 className="text-display-md font-extrabold [font-stretch:85%] decoration-brand decoration-2 underline-offset-8 group-hover:underline">
              {first.title}
            </h2>
            <p className="text-lg text-ink-2">{first.excerpt}</p>
            <p className="text-sm text-ink-3">
              <time dateTime={first.publishedAt}>{formatPostDate(first.publishedAt)}</time>
            </p>
          </div>
        </Link>

        <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <li key={post.slug} className="reveal">
              <Link href={`/blog/${post.slug}`} className="group block space-y-5">
                <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-line">
                  <Image
                    src={post.cover.src}
                    alt={post.cover.alt}
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]"
                  />
                </div>
                <p className="eyebrow text-ink-3">
                  {post.tags[0]} · {readingMinutes(post)} min de leitura
                </p>
                <h2 className="text-display-sm font-bold decoration-brand decoration-2 underline-offset-4 group-hover:underline">
                  {post.title}
                </h2>
                <p className="text-ink-2">{post.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
