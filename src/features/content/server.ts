import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import type { Banner, Faq, Post, PostDoc, Project, ProjectDoc, Testimonial } from "@/lib/domain/content";
import { adminDb } from "@/lib/firebase/admin";
import { resolveMedia, type SiteImage } from "@/lib/media";

/**
 * Leitura dos conteúdos para o site e o painel, em cache até o painel guardar uma alteração
 * (updateTag(CONTENT_TAG) nas ações). Coleções pequenas: lê-se tudo e filtra-se aqui.
 */
export const CONTENT_TAG = "content";

/** Dados do documento com o id e sem nenhum carimbo de data (os Timestamps não passam pela cache). */
async function readAll<T>(collection: string): Promise<(T & { id: string })[]> {
  const snap = await adminDb().collection(collection).get();
  return snap.docs.map((doc) => {
    const data = Object.fromEntries(
      Object.entries(doc.data()).filter(([key, value]) => !(value instanceof Timestamp) && key !== "updatedBy"),
    );
    return { ...(data as T), id: doc.id };
  });
}

const image = (m: Parameters<typeof resolveMedia>[0]) => resolveMedia(m);
const images = (list: Parameters<typeof resolveMedia>[0][]) =>
  list.map(image).filter((i): i is SiteImage => i !== null);

export async function getAllProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return (await readAll<ProjectDoc>("projects"))
    .map((p) => {
      const cover = image(p.cover);
      const before = p.beforeAfter && image(p.beforeAfter.before);
      const after = p.beforeAfter && image(p.beforeAfter.after);
      return {
        ...p,
        // Sem capa válida o cartão não tem o que mostrar: fica a primeira da galeria
        cover: cover ?? images(p.gallery)[0] ?? null,
        gallery: images(p.gallery),
        beforeAfter:
          before && after && p.beforeAfter
            ? {
                before: { ...before, label: p.beforeAfter.before.label },
                after: { ...after, label: p.beforeAfter.after.label },
              }
            : null,
      } as Project;
    })
    .filter((p) => p.cover)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "pt"));
}

export async function getProjects() {
  return (await getAllProjects()).filter((p) => p.status === "publicado");
}

export async function getProject(slug: string) {
  return (await getProjects()).find((p) => p.slug === slug) ?? null;
}

export async function getAllPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return (await readAll<PostDoc>("posts"))
    .map((p) => ({ ...p, cover: image(p.cover) }) as Post)
    .filter((p) => p.cover)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPosts() {
  return (await getAllPosts()).filter((p) => p.status === "publicado");
}

export async function getPost(slug: string) {
  return (await getPosts()).find((p) => p.slug === slug) ?? null;
}

export async function getAllFaqs(): Promise<Faq[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return (await readAll<Faq>("faqs")).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getAllTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return (await readAll<Testimonial>("testimonials")).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getAllBanners(): Promise<Banner[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return (await readAll<Banner>("banners")).sort((a, b) => (b.startsAt || "").localeCompare(a.startsAt || ""));
}

/**
 * Banners ativos de um lugar. As datas comparam-se no browser (BannerSlot): a página fica em cache e
 * o banner aparece e sai no dia certo sem rever a página.
 */
export async function getBanners(placement: Banner["placement"]) {
  return (await getAllBanners()).filter((b) => b.active && b.placement === placement);
}
