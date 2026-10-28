"use server";

import { revalidatePath, updateTag } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { PRODUCTS } from "@/content/products";
import { SERVICES } from "@/content/services";
import { CATALOG_TAG } from "@/features/catalog/server";
import type { SessionUser } from "@/lib/auth/session";
import { defaultConfig, type ProductDoc, type ServiceDoc } from "@/lib/domain/catalog";
import { priceItem, PricingError } from "@/lib/domain/pricing";
import { routeFor, WORKSHOP_SECTORS } from "@/lib/domain/production";
import { slugify } from "@/lib/domain/search";
import { adminDb } from "@/lib/firebase/admin";
import { toMedia } from "@/lib/media";
import { NO_PERMISSION, staffCan } from "./guard";
import { mediaSchema } from "./media-schema";

export type CatalogResult = { ok: true; created?: number } | { ok: false; message: string };

const cents = z.number().int().min(0).max(1_000_000_000);
const text = (max: number, message = "Campo obrigatório.") => z.string().trim().min(1, message).max(max);

const media = mediaSchema;

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

/** O site, o checkout e o painel leem o catálogo em cache: depois de guardar, todos veem logo a mudança. */
function refresh() {
  updateTag(CATALOG_TAG);
  revalidatePath("/admin/catalogo", "layout");
}

const fail = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof Error ? error.message : fallback,
});

/**
 * Primeira importação: passa para o Firestore os produtos e serviços que estavam no código, com o percurso
 * de oficina que já se usava. Não toca em nada que já exista, por isso pode correr mais do que uma vez.
 */
export async function importCatalog(): Promise<CatalogResult> {
  const user = await staffCan("catalog", "create");
  if (!user) return NO_PERMISSION;
  const db = adminDb();
  try {
    const created = await db.runTransaction(async (tx) => {
      const productRefs = PRODUCTS.map((p) => db.collection("products").doc(p.slug));
      const serviceRefs = SERVICES.map((s) => db.collection("services").doc(s.slug));
      const existing = await tx.getAll(...productRefs, ...serviceRefs);
      const exists = new Set(existing.filter((d) => d.exists).map((d) => d.ref.path));
      const at = Timestamp.now();
      let count = 0;
      PRODUCTS.forEach((product, i) => {
        if (exists.has(productRefs[i].path)) return;
        const doc: ProductDoc = {
          ...product,
          image: product.image ? toMedia(product.image) : null,
          route: routeFor(product.slug),
          consumption: [],
          active: true,
          sortOrder: (i + 1) * 10,
        };
        tx.set(productRefs[i], { ...doc, updatedAt: at, updatedBy: user.uid });
        count++;
      });
      SERVICES.forEach((service, i) => {
        if (exists.has(serviceRefs[i].path)) return;
        const doc: ServiceDoc = {
          ...service,
          gallery: service.gallery.map((g) => ({ ...toMedia(g), caption: g.caption })),
          active: true,
          sortOrder: (i + 1) * 10,
        };
        tx.set(serviceRefs[i], { ...doc, updatedAt: at, updatedBy: user.uid });
        count++;
      });
      if (count) audit(tx, user, "catalog.imported", "products", "catalogo", `${count} registo(s)`);
      return count;
    });
    refresh();
    return { ok: true, created };
  } catch (error) {
    return fail(error, "Não foi possível importar o catálogo.");
  }
}

const choiceSchema = z.object({
  key: z.string().max(60),
  label: text(80, "Dá um nome a cada escolha."),
  default: z.boolean(),
});

const productSchema = z.object({
  name: text(80, "Indica o nome do produto."),
  summary: text(240, "Escreve o resumo que aparece na lista."),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  image: media.nullable(),
  unit: text(30, "Indica a unidade (ex.: cartões)."),
  minQty: z.number().int().min(1).max(100_000),
  quantityPresets: z.array(z.number().int().min(1).max(1_000_000)).max(8),
  leadTime: z.object({ normalDays: z.number().int().min(0).max(90), urgentDays: z.number().int().min(0).max(90) }),
  allowDesignService: z.boolean(),
  pricing: z.object({
    tiers: z
      .array(z.object({ minQty: z.number().int().min(1), unitPrice: cents }))
      .max(12)
      .optional(),
    pricePerM2: cents.optional(),
    minAreaM2: z.number().min(0).max(100).optional(),
    fixedPrice: cents.optional(),
    setupFee: cents.optional(),
    designFee: cents.optional(),
    urgentSurchargePct: z.number().min(0).max(300),
    modifiers: z
      .array(
        z.object({
          group: z.string().max(60),
          choice: z.string().max(60),
          type: z.enum(["add_unit", "add_m2", "add_fixed", "percent"]),
          value: z.number().int().min(-1_000_000_000).max(1_000_000_000),
        }),
      )
      .max(60),
  }),
  choices: z.record(z.string(), z.array(choiceSchema).min(1, "Cada opção precisa de pelo menos uma escolha.").max(20)),
  route: z.array(z.enum(WORKSHOP_SECTORS as [string, ...string[]])).min(1, "Escolhe pelo menos um setor da oficina."),
  consumption: z
    .array(
      z.object({
        materialId: z.string().min(1, "Escolhe o material de cada regra de consumo."),
        per: z.enum(["unit", "m2", "sheet"]),
        qty: z.number().positive("A quantidade de consumo tem de ser maior que zero.").max(10_000),
        wastePct: z.number().min(0).max(100),
        when: z.object({ group: z.string(), choice: z.string() }).optional(),
      }),
    )
    .max(20),
});

export type ProductInput = z.input<typeof productSchema>;

/**
 * Edita um produto. A estrutura (modelo de preço, grupos de opções, pré-visualização, tamanhos de impressão)
 * fica como está; mudam textos, preços, escolhas, prazos, percurso e consumo.
 * shortcut: não se criam produtos novos no painel, porque cada um precisa da sua pré-visualização no código;
 * um produto novo pede-se ao programador ou entra como orçamento personalizado.
 */
export async function updateProduct(slug: string, input: ProductInput): Promise<CatalogResult> {
  const user = await staffCan("catalog", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;
  const db = adminDb();
  const ref = db.collection("products").doc(slug);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Produto não encontrado.");
      const current = snap.data() as ProductDoc;

      const optionGroups = current.optionGroups.map((group) => {
        if (group.type !== "select") return group;
        const choices = (data.choices[group.key] ?? group.choices ?? []).map((c) => ({
          key: c.key || slugify(c.label),
          label: c.label,
          ...(c.default ? { default: true } : {}),
        }));
        if (new Set(choices.map((c) => c.key)).size !== choices.length)
          throw new Error(`Há duas escolhas iguais em "${group.label}".`);
        return { ...group, choices };
      });
      const valid = new Set(optionGroups.flatMap((g) => (g.choices ?? []).map((c) => `${g.key}:${c.key}`)));
      const modifiers = data.pricing.modifiers.filter((m) => m.value !== 0 && valid.has(`${m.group}:${m.choice}`));
      const consumption = data.consumption.map((rule) =>
        rule.when && !valid.has(`${rule.when.group}:${rule.when.choice}`) ? { ...rule, when: undefined } : rule,
      );

      const next: ProductDoc = {
        ...current,
        name: data.name,
        summary: data.summary,
        active: data.active,
        sortOrder: data.sortOrder,
        image: data.image,
        unit: data.unit,
        minQty: data.minQty,
        quantityPresets: [...new Set(data.quantityPresets.filter((q) => q >= data.minQty))].sort((a, b) => a - b),
        leadTime: data.leadTime,
        allowDesignService: data.allowDesignService,
        optionGroups,
        pricing: {
          ...current.pricing,
          ...(current.pricing.model === "tiered_unit"
            ? { tiers: [...(data.pricing.tiers ?? [])].sort((a, b) => a.minQty - b.minQty) }
            : {}),
          ...(current.pricing.model === "area_m2"
            ? { pricePerM2: data.pricing.pricePerM2, minAreaM2: data.pricing.minAreaM2 }
            : {}),
          ...(current.pricing.model === "fixed" ? { fixedPrice: data.pricing.fixedPrice } : {}),
          setupFee: data.pricing.setupFee || undefined,
          designFee: data.pricing.designFee || undefined,
          urgentSurchargePct: data.pricing.urgentSurchargePct,
          modifiers,
        },
        route: WORKSHOP_SECTORS.filter((s) => data.route.includes(s)),
        consumption,
      };
      if (next.pricing.model === "tiered_unit" && !next.pricing.tiers?.length)
        throw new Error("Indica pelo menos um escalão de preço.");
      if (next.leadTime.urgentDays > next.leadTime.normalDays)
        throw new Error("O prazo urgente não pode ser maior que o normal.");
      // O preço mínimo tem de dar: é o "a partir de" da lista e o primeiro preço do configurador
      try {
        priceItem(next, defaultConfig({ ...next, image: null }));
      } catch (error) {
        throw new Error(error instanceof PricingError ? `Preço inválido: ${error.message}` : "Preço inválido.");
      }
      tx.set(ref, { ...next, updatedAt: Timestamp.now(), updatedBy: user.uid });
      audit(tx, user, "product.updated", "products", slug, next.name);
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível guardar o produto.");
  }
}

const serviceSchema = z.object({
  name: text(60, "Indica o nome do serviço."),
  summary: text(240, "Escreve o resumo do serviço."),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  priceFrom: cents,
  unit: z.string().trim().max(40),
  leadTime: z.string().trim().max(40),
  tags: z.array(z.string().trim().min(1).max(30)).max(8),
  intro: text(400, "Escreve a introdução."),
  body: z.array(z.string().trim().min(1).max(1500)).max(10),
  products: z.array(z.string().trim().min(1).max(80)).max(20),
  specs: z.object({
    title: z.string().trim().max(60),
    items: z.array(z.object({ name: text(60), detail: z.string().trim().max(200) })).max(20),
  }),
  deadlines: z
    .array(z.object({ item: text(80), normal: text(40), urgent: z.string().trim().max(40).nullable() }))
    .max(20),
  gallery: z.array(media.extend({ caption: z.string().trim().max(80) })).max(16),
});

export type ServiceInput = z.input<typeof serviceSchema>;

/** Edita a página de um serviço. shortcut: os serviços também não se criam no painel (cada um tem o seu slug). */
export async function updateService(slug: string, input: ServiceInput): Promise<CatalogResult> {
  const user = await staffCan("catalog", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const db = adminDb();
  const ref = db.collection("services").doc(slug);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Serviço não encontrado.");
      const data = parsed.data;
      const next = { ...data, deadlines: data.deadlines.map((d) => ({ ...d, urgent: d.urgent || null })) };
      tx.update(ref, { ...next, updatedAt: Timestamp.now(), updatedBy: user.uid });
      audit(tx, user, "service.updated", "services", slug, data.name);
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível guardar o serviço.");
  }
}
