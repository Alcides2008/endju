"use server";

import { revalidatePath, updateTag } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { POSTS } from "@/content/blog";
import { FAQS } from "@/content/faq";
import { TESTIMONIALS } from "@/content/home";
import { PROJECTS } from "@/content/portfolio";
import { CONTENT_TAG } from "@/features/content/server";
import type { SessionUser } from "@/lib/auth/session";
import {
  BANNER_PLACEMENTS,
  FAQ_CATEGORIES,
  SECTORS,
  type PostDoc,
  type ProjectDoc,
  type PublishStatus,
} from "@/lib/domain/content";
import type { Module } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";
import { toMedia } from "@/lib/media";
import { NO_PERMISSION, staffCan } from "./guard";
import { mediaSchema } from "./media-schema";

export type ContentResult = { ok: true; id?: string; created?: number } | { ok: false; message: string };

const text = (max: number, message = "Campo obrigatório.") => z.string().trim().min(1, message).max(max);
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "O endereço só leva minúsculas, números e hífenes (ex.: fachada-loja-viana).")
  .max(80);
const day = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")]);
const href = z
  .string()
  .trim()
  .regex(/^(\/\S*|https:\/\/\S+|mailto:\S+|tel:\S+)$/, "Ligação inválida (ex.: /orcamento).");

const actorName = (user: SessionUser) => user.name ?? user.email ?? "Equipa";

function audit(
  tx: FirebaseFirestore.Transaction,
  user: SessionUser,
  action: string,
  type: string,
  id: string,
  label: string,
) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action,
    entity: { type, id, label },
    at: Timestamp.now(),
  });
}

/** O site lê os conteúdos em cache: depois de guardar, todos veem logo a mudança. */
function refresh() {
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/portfolio", "layout");
  revalidatePath("/admin/conteudo", "layout");
}

const fail = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof Error ? error.message : fallback,
});

/**
 * Primeira importação: passa para o Firestore o portfólio, os artigos, as perguntas frequentes e os testemunhos
 * que estavam no código. Os testemunhos ficam marcados como exemplo (vieram do briefing, não de clientes reais).
 * Não toca no que já existe, por isso pode correr mais do que uma vez.
 */
export async function importContent(): Promise<ContentResult> {
  const user = await staffCan("cms", "create");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const at = Timestamp.now();
  const docs: [FirebaseFirestore.DocumentReference, object][] = [
    ...PROJECTS.map((p, i): [FirebaseFirestore.DocumentReference, object] => {
      const doc: Omit<ProjectDoc, "id"> = {
        ...p,
        cover: toMedia(p.cover),
        gallery: p.gallery.map(toMedia),
        beforeAfter: p.beforeAfter
          ? {
              before: { ...toMedia(p.beforeAfter.before), label: p.beforeAfter.before.label },
              after: { ...toMedia(p.beforeAfter.after), label: p.beforeAfter.after.label },
            }
          : null,
        status: "publicado",
        sortOrder: (i + 1) * 10,
      };
      return [db.collection("projects").doc(p.slug), doc];
    }),
    ...POSTS.map((p): [FirebaseFirestore.DocumentReference, object] => {
      const doc: Omit<PostDoc, "id"> = { ...p, cover: toMedia(p.cover), status: "publicado" };
      return [db.collection("posts").doc(p.slug), doc];
    }),
    ...FAQS.map((f, i): [FirebaseFirestore.DocumentReference, object] => [
      db.collection("faqs").doc(`faq-${String(i + 1).padStart(2, "0")}`),
      { ...f, sortOrder: (i + 1) * 10, active: true },
    ]),
    ...TESTIMONIALS.map((t, i): [FirebaseFirestore.DocumentReference, object] => [
      db.collection("testimonials").doc(`exemplo-${i + 1}`),
      { ...t, sortOrder: (i + 1) * 10, active: true, example: true },
    ]),
  ];
  try {
    const created = await db.runTransaction(async (tx) => {
      const existing = await tx.getAll(...docs.map(([ref]) => ref));
      const taken = new Set(existing.filter((d) => d.exists).map((d) => d.ref.path));
      let count = 0;
      for (const [ref, data] of docs) {
        if (taken.has(ref.path)) continue;
        tx.set(ref, { ...data, createdAt: at, updatedAt: at, updatedBy: user.uid });
        count++;
      }
      if (count) audit(tx, user, "content.imported", "projects", "conteudos", `${count} registo(s)`);
      return count;
    });
    refresh();
    return { ok: true, created };
  } catch (error) {
    return fail(error, "Não foi possível importar os conteúdos.");
  }
}

// ── Portfólio e blog: rascunho → publicado (só quem aprova publica; docs/03 · Portfólio / CMS) ──

const labeled = mediaSchema.extend({ label: z.string().trim().max(40) });
// Um rascunho pode ainda não ter capa; publicar exige-a (setContentStatus)
const cover = mediaSchema.or(z.object({ src: z.literal(""), alt: z.string().max(200) }));

const projectSchema = z.object({
  slug,
  title: text(120, "Dá um título ao projeto."),
  clientName: z.string().trim().max(80),
  clientVisible: z.boolean(),
  sector: z.enum(SECTORS),
  serviceSlugs: z.array(z.string().max(60)).max(6),
  summary: z.string().trim().max(240),
  cover,
  video: z
    .object({ src: z.string().regex(/^\/portfolio\/[\w-]+\.mp4$/, "Vídeo inválido."), posterTime: z.number().min(0) })
    .nullable(),
  gallery: z.array(mediaSchema).max(24),
  beforeAfter: z.object({ before: labeled, after: labeled }).nullable(),
  challenge: z.string().trim().max(2000),
  solution: z.string().trim().max(2000),
  result: z.string().trim().max(2000),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});

export type ProjectInput = z.input<typeof projectSchema>;

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: text(3000, "Há um parágrafo vazio.") }),
  z.object({ type: z.literal("h2"), text: text(120, "Há um subtítulo vazio.") }),
  z.object({ type: z.literal("tip"), text: text(600, "Há uma dica vazia.") }),
  z.object({ type: z.literal("ul"), items: z.array(text(400)).min(1, "Há uma lista vazia.").max(30) }),
]);

const postSchema = z.object({
  slug,
  title: text(140, "Dá um título ao artigo."),
  excerpt: z.string().trim().max(300),
  cover,
  tags: z.array(z.string().trim().min(1).max(30)).max(6),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica a data do artigo."),
  author: text(60, "Indica o autor."),
  blocks: z.array(blockSchema).max(120),
});

export type PostInput = z.input<typeof postSchema>;

const KINDS = {
  projects: {
    module: "portfolio" as Module,
    schema: projectSchema,
    label: "projeto",
    title: (d: { title: string }) => d.title,
  },
  posts: { module: "cms" as Module, schema: postSchema, label: "artigo", title: (d: { title: string }) => d.title },
};
type Kind = keyof typeof KINDS;

async function slugTaken(kind: Kind, value: string, exceptId: string) {
  const snap = await adminDb().collection(kind).where("slug", "==", value).limit(2).get();
  return snap.docs.some((d) => d.id !== exceptId);
}

/** Rascunho novo, com o mínimo para abrir o editor. */
export async function createDraft(kind: Kind): Promise<ContentResult> {
  const user = await staffCan(KINDS[kind].module, "create");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const ref = db.collection(kind).doc();
  const at = Timestamp.now();
  const base = { slug: `rascunho-${ref.id.slice(0, 6).toLowerCase()}`, status: "rascunho" as PublishStatus };
  const data =
    kind === "projects"
      ? {
          ...base,
          title: "Projeto sem título",
          clientName: "",
          clientVisible: false,
          sector: SECTORS[0],
          serviceSlugs: [],
          summary: "",
          cover: { src: "", alt: "" },
          video: null,
          gallery: [],
          beforeAfter: null,
          challenge: "",
          solution: "",
          result: "",
          featured: false,
          sortOrder: 999,
        }
      : {
          ...base,
          title: "Artigo sem título",
          excerpt: "",
          cover: { src: "", alt: "" },
          tags: [],
          publishedAt: new Date().toISOString().slice(0, 10),
          author: actorName(user),
          blocks: [],
        };
  await db.runTransaction(async (tx) => {
    tx.set(ref, { ...data, createdAt: at, updatedAt: at, updatedBy: user.uid });
    audit(tx, user, `${kind === "projects" ? "project" : "post"}.created`, kind, ref.id, data.title);
  });
  refresh();
  return { ok: true, id: ref.id };
}

/**
 * Guarda um projeto ou artigo. Quem só cria e edita (Designer) mexe nos rascunhos; o que está publicado
 * só muda com quem pode publicar, para nada sair para o site sem o Gestor ver.
 */
export async function saveContent(kind: Kind, id: string, input: ProjectInput | PostInput): Promise<ContentResult> {
  const { module, schema, label } = KINDS[kind];
  const user = await staffCan(module, "edit");
  if (!user) return NO_PERMISSION;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (await slugTaken(kind, parsed.data.slug, id))
    return { ok: false, message: `Já existe outro ${label} com o endereço ${parsed.data.slug}.` };
  const canPublish = Boolean(await staffCan(module, "approve"));
  const db = adminDb();
  const ref = db.collection(kind).doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`O ${label} já não existe.`);
      if (snap.get("status") === "publicado" && !canPublish)
        throw new Error(`Este ${label} está publicado: só o Gestor o altera.`);
      tx.update(ref, { ...parsed.data, updatedAt: Timestamp.now(), updatedBy: user.uid });
      audit(tx, user, `${kind === "projects" ? "project" : "post"}.updated`, kind, id, KINDS[kind].title(parsed.data));
    });
    refresh();
    return { ok: true, id };
  } catch (error) {
    return fail(error, `Não foi possível guardar o ${label}.`);
  }
}

/** Publicar ou voltar a rascunho. Só se publica com capa e texto completos. */
export async function setContentStatus(kind: Kind, id: string, status: PublishStatus): Promise<ContentResult> {
  const { module, schema, label } = KINDS[kind];
  const user = await staffCan(module, "approve");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const ref = db.collection(kind).doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`O ${label} já não existe.`);
      if (status === "publicado") {
        const check = schema.safeParse(snap.data());
        if (!check.success) throw new Error(`Falta completar antes de publicar: ${check.error.issues[0].message}`);
        const missing = !snap.get("cover.src")
          ? "a capa"
          : kind === "projects"
            ? !snap.get("summary")
              ? "o resumo"
              : !snap.get("challenge")
                ? "o desafio"
                : null
            : !snap.get("excerpt")
              ? "o resumo"
              : !(snap.get("blocks") ?? []).length
                ? "o texto"
                : null;
        if (missing) throw new Error(`Falta ${missing} antes de publicar.`);
      }
      tx.update(ref, {
        status,
        ...(status === "publicado" && !snap.get("publishedFirstAt") ? { publishedFirstAt: Timestamp.now() } : {}),
        updatedAt: Timestamp.now(),
        updatedBy: user.uid,
      });
      audit(
        tx,
        user,
        `${kind === "projects" ? "project" : "post"}.${status === "publicado" ? "published" : "unpublished"}`,
        kind,
        id,
        snap.get("title"),
      );
    });
    refresh();
    return { ok: true, id };
  } catch (error) {
    return fail(error, "Não foi possível mudar o estado.");
  }
}

// ── Listas simples: FAQ, testemunhos, banners ──

const RECORDS = {
  faqs: {
    schema: z.object({
      category: z.enum(FAQ_CATEGORIES.map((c) => c.id) as [string, ...string[]]),
      question: text(200, "Escreve a pergunta."),
      answer: text(2000, "Escreve a resposta."),
      sortOrder: z.number().int().min(0).max(10_000),
      active: z.boolean(),
    }),
    label: (d: { question: string }) => d.question,
    publish: false,
  },
  testimonials: {
    schema: z.object({
      quote: text(400, "Escreve o testemunho."),
      name: text(60, "Indica o nome."),
      role: z.string().trim().max(60),
      company: z.string().trim().max(80),
      sortOrder: z.number().int().min(0).max(10_000),
      active: z.boolean(),
      example: z.boolean(),
    }),
    label: (d: { name: string }) => d.name,
    publish: false,
  },
  banners: {
    schema: z
      .object({
        placement: z.enum(BANNER_PLACEMENTS),
        title: text(90, "Escreve o título do banner."),
        body: z.string().trim().max(200),
        cta: z.object({ label: text(30, "Escreve o texto do botão."), href }).nullable(),
        startsAt: day,
        endsAt: day,
        active: z.boolean(),
      })
      .refine((b) => !b.startsAt || !b.endsAt || b.startsAt <= b.endsAt, "O fim tem de ser depois do início."),
    label: (d: { title: string }) => d.title,
    // Um banner aparece em todo o site: ativar é publicar
    publish: true,
  },
};
export type RecordKind = keyof typeof RECORDS;

/** Cria (id vazio) ou guarda uma linha. FAQ e testemunhos: quem edita conteúdos; banners: só quem publica. */
export async function saveRecord(kind: RecordKind, id: string | null, input: unknown): Promise<ContentResult> {
  const config = RECORDS[kind];
  const user = await staffCan("cms", config.publish ? "approve" : id ? "edit" : "create");
  if (!user) return NO_PERMISSION;
  const parsed = config.schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const db = adminDb();
  const ref = id ? db.collection(kind).doc(id) : db.collection(kind).doc();
  try {
    await db.runTransaction(async (tx) => {
      const at = Timestamp.now();
      if (id && !(await tx.get(ref)).exists) throw new Error("Este registo já não existe.");
      tx.set(
        ref,
        { ...parsed.data, ...(id ? {} : { createdAt: at }), updatedAt: at, updatedBy: user.uid },
        { merge: true },
      );
      audit(tx, user, `${kind}.${id ? "updated" : "created"}`, kind, ref.id, config.label(parsed.data as never));
    });
    refresh();
    return { ok: true, id: ref.id };
  } catch (error) {
    return fail(error, "Não foi possível guardar.");
  }
}

/** Apagar de vez: só o Administrador (letra X da matriz). No dia a dia, desativa-se. */
export async function deleteContent(kind: RecordKind | Kind, id: string): Promise<ContentResult> {
  const user = await staffCan(kind === "projects" ? "portfolio" : "cms", "delete");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  const ref = db.collection(kind).doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      tx.delete(ref);
      audit(tx, user, `${kind}.deleted`, kind, id, snap.get("title") ?? snap.get("question") ?? snap.get("name") ?? id);
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível apagar.");
  }
}
