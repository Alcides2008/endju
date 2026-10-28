import type { MetadataRoute } from "next";
import { getProducts, getServices } from "@/features/catalog/server";
import { getPosts, getProjects } from "@/features/content/server";
import { SITE_URL } from "@/lib/seo";

const PAGES = ["", "/servicos", "/portfolio", "/blog", "/orcamento", "/orcamento/personalizado", "/sobre", "/faq"];
const LEGAL = ["/contacto", "/privacidade", "/termos"];

/** Só as páginas públicas; conta, painel, carrinho e checkout ficam de fora (e no robots.txt). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, products, projects, posts] = await Promise.all([
    getServices(),
    getProducts(),
    getProjects(),
    getPosts(),
  ]);
  const page = (path: string, priority: number, lastModified?: string) => ({
    url: `${SITE_URL}${path}`,
    priority,
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    ...PAGES.map((path) => page(path, path === "" ? 1 : 0.8)),
    ...services.map((s) => page(`/servicos/${s.slug}`, 0.9)),
    ...products.map((p) => page(`/orcamento/${p.slug}`, 0.8)),
    ...projects.map((p) => page(`/portfolio/${p.slug}`, 0.6)),
    ...posts.map((p) => page(`/blog/${p.slug}`, 0.6, p.publishedAt)),
    ...LEGAL.map((path) => page(path, 0.4)),
  ];
}
