import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Product, ProductDoc, Service, ServiceDoc } from "@/lib/domain/catalog";
import { adminDb } from "@/lib/firebase/admin";
import { resolveMedia, type SiteImage } from "@/lib/media";

/**
 * Leitura do catálogo para o site, o checkout e o painel. Fica em cache até o painel guardar uma alteração
 * (updateTag(CATALOG_TAG) nas ações): o site não lê o Firestore a cada visita.
 */
export const CATALOG_TAG = "catalog";

const bySortOrder = <T extends { sortOrder: number; name: string }>(a: T, b: T) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt");

/** Todos os produtos, ativos e inativos (o painel precisa dos dois). */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CATALOG_TAG);
  const snap = await adminDb().collection("products").get();
  return snap.docs
    .map((doc) => {
      // updatedAt é um Timestamp, que a cache não serializa; o site não precisa dele
      const { updatedAt: _u, updatedBy: _b, ...data } = doc.data() as ProductDoc & Record<string, unknown>;
      return { ...data, image: resolveMedia(data.image) } as Product;
    })
    .sort(bySortOrder);
}

export async function getProducts() {
  return (await getCatalog()).filter((p) => p.active);
}

export async function getProduct(slug: string) {
  return (await getCatalog()).find((p) => p.slug === slug && p.active) ?? null;
}

export async function getAllServices(): Promise<Service[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CATALOG_TAG);
  const snap = await adminDb().collection("services").get();
  return snap.docs
    .map((doc) => {
      const { updatedAt: _u, updatedBy: _b, ...data } = doc.data() as ServiceDoc & Record<string, unknown>;
      const gallery = data.gallery
        .map((m) => {
          const image = resolveMedia(m);
          return image ? { ...image, caption: m.caption } : null;
        })
        .filter((g): g is SiteImage & { caption: string } => g !== null);
      return { ...data, gallery } as Service;
    })
    .sort(bySortOrder);
}

export async function getServices() {
  return (await getAllServices()).filter((s) => s.active);
}

export async function getService(slug: string) {
  return (await getAllServices()).find((s) => s.slug === slug && s.active) ?? null;
}

/** Nome de cada serviço pelo slug, para as etiquetas do portfólio. */
export async function getServiceNames(): Promise<Record<string, string>> {
  return Object.fromEntries((await getAllServices()).map((s) => [s.slug, s.name]));
}
