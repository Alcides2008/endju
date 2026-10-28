import type { Media, SiteImage } from "@/lib/media";

/**
 * Conteúdos do site (docs/02 · Conteúdo): portfólio, blog, FAQ, testemunhos e banners.
 * Os dados vivem no Firestore; os ficheiros de src/content só servem para a primeira importação.
 */
export const SECTORS = ["Saúde", "Educação", "Comércio", "Eventos", "Desporto", "Moda", "Cultura"] as const;
export type Sector = (typeof SECTORS)[number];

export const PUBLISH_STATUSES = ["rascunho", "publicado"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];
export const PUBLISH_LABELS: Record<PublishStatus, string> = { rascunho: "Rascunho", publicado: "Publicado" };

type Labeled<T> = T & { label: string };

export type ProjectBase = {
  slug: string;
  title: string;
  clientName: string;
  /** Nome do cliente só com autorização; senão o site mostra o setor */
  clientVisible: boolean;
  sector: Sector;
  /** Slugs dos serviços: são as categorias do filtro */
  serviceSlugs: string[];
  summary: string;
  cover: SiteImage;
  video: { src: string; posterTime: number } | null;
  gallery: SiteImage[];
  beforeAfter: { before: Labeled<SiteImage>; after: Labeled<SiteImage> } | null;
  challenge: string;
  solution: string;
  result: string;
  featured: boolean;
};

export type Project = ProjectBase & { id: string; status: PublishStatus; sortOrder: number };

export type ProjectDoc = Omit<Project, "id" | "cover" | "gallery" | "beforeAfter"> & {
  cover: Media;
  gallery: Media[];
  beforeAfter: { before: Labeled<Media>; after: Labeled<Media> } | null;
};

/** Nome a mostrar: o do cliente quando autorizado, senão o setor. */
export function projectClient(project: Pick<ProjectBase, "clientVisible" | "clientName" | "sector">) {
  return project.clientVisible ? project.clientName : project.sector;
}

export type PostBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "tip"; text: string };

export type PostBase = {
  slug: string;
  title: string;
  excerpt: string;
  cover: SiteImage;
  tags: string[];
  /** Data do artigo, "2026-10-27" */
  publishedAt: string;
  author: string;
  blocks: PostBlock[];
};

export type Post = PostBase & { id: string; status: PublishStatus };

export type PostDoc = Omit<Post, "id" | "cover"> & { cover: Media };

/** Minutos de leitura a 200 palavras por minuto. */
export function readingMinutes(post: Pick<PostBase, "blocks">) {
  const words = post.blocks
    .flatMap((block) => ("items" in block ? block.items : [block.text]))
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** "2026-10-27" → "27 de outubro de 2026" */
export function formatPostDate(iso: string) {
  return new Intl.DateTimeFormat("pt-AO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export const FAQ_CATEGORIES = [
  { id: "encomendas", label: "Encomendas" },
  { id: "ficheiros", label: "Ficheiros e provas" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "entregas", label: "Entregas e montagem" },
  { id: "geral", label: "Geral" },
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]["id"];

export type Faq = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  sortOrder: number;
  active: boolean;
  /** Testemunho de exemplo (veio do briefing do site), a trocar por um real antes de publicar o site */
  example: boolean;
};

export const BANNER_PLACEMENTS = ["site_topbar", "home_strip"] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];
export const PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  site_topbar: "Barra no topo de todas as páginas",
  home_strip: "Faixa na Home, a seguir à abertura",
};

export type Banner = {
  id: string;
  placement: BannerPlacement;
  title: string;
  body: string;
  cta: { label: string; href: string } | null;
  /** Dias "2026-12-01", incluídos; vazios = sem limite */
  startsAt: string;
  endsAt: string;
  active: boolean;
};

/** Está no ar hoje? Compara só o dia (hora de Luanda), para não depender do fuso do servidor. */
export function bannerLive(banner: Pick<Banner, "active" | "startsAt" | "endsAt">, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Luanda" }).format(now); // "2026-10-28"
  return banner.active && (!banner.startsAt || banner.startsAt <= today) && (!banner.endsAt || today <= banner.endsAt);
}
