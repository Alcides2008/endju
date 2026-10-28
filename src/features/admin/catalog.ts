import "server-only";
import type { ProductDoc, ServiceDoc } from "@/lib/domain/catalog";
import { adminDb } from "@/lib/firebase/admin";

/** Documento tal como está no Firestore, para o editor do painel (com as imagens por resolver). */
export async function getProductDoc(slug: string): Promise<ProductDoc | null> {
  const snap = await adminDb().collection("products").doc(slug).get();
  if (!snap.exists) return null;
  const { updatedAt: _u, updatedBy: _b, ...data } = snap.data() as ProductDoc & Record<string, unknown>;
  return data as ProductDoc;
}

export async function getServiceDoc(slug: string): Promise<ServiceDoc | null> {
  const snap = await adminDb().collection("services").doc(slug).get();
  if (!snap.exists) return null;
  const { updatedAt: _u, updatedBy: _b, ...data } = snap.data() as ServiceDoc & Record<string, unknown>;
  return data as ServiceDoc;
}
