import "server-only";
import type { PostDoc, ProjectDoc } from "@/lib/domain/content";
import { adminDb } from "@/lib/firebase/admin";

/** Projetos e artigos tal como estão no Firestore, rascunhos incluídos (o site em cache só mostra publicados). */
async function readDocs<T>(collection: string) {
  const snap = await adminDb().collection(collection).get();
  return snap.docs.map((doc) => {
    const { updatedAt, updatedBy: _b, createdAt: _c, publishedFirstAt: _p, ...data } = doc.data();
    return {
      ...(data as T),
      id: doc.id,
      updatedAt: (updatedAt as FirebaseFirestore.Timestamp | undefined)?.toDate() ?? null,
    };
  });
}

export async function listProjectDocs() {
  return (await readDocs<ProjectDoc>("projects")).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listPostDocs() {
  return (await readDocs<PostDoc>("posts")).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

async function readDoc<T>(collection: string, id: string) {
  const snap = await adminDb().collection(collection).doc(id).get();
  if (!snap.exists) return null;
  const { updatedAt: _u, updatedBy: _b, createdAt: _c, publishedFirstAt: _p, ...data } = snap.data()!;
  return { ...(data as T), id: snap.id };
}

export const getProjectDoc = (id: string) => readDoc<ProjectDoc>("projects", id);
export const getPostDoc = (id: string) => readDoc<PostDoc>("posts", id);
