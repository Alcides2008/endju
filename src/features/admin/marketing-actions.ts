"use server";

import { revalidatePath, updateTag } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import {
  CAMPAIGN_CHANNELS,
  COUPON_TYPES,
  LEAD_SOURCES,
  LEAD_STAGES,
  POPUP_TRIGGERS,
  normalizeCode,
} from "@/lib/domain/marketing";
import { searchTokens } from "@/lib/domain/search";
import { adminDb } from "@/lib/firebase/admin";
import { MARKETING_TAG } from "@/features/marketing/server";
import { NO_PERMISSION, staffCan } from "./guard";

export type MarketingResult = { ok: true; id?: string } | { ok: false; message: string };

const cents = z.number().int().min(0).max(10_000_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica a data de início.");
const optionalDay = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
const atStart = (d: string) => Timestamp.fromDate(new Date(`${d}T00:00:00+01:00`));
const atEnd = (d: string) => Timestamp.fromDate(new Date(`${d}T23:59:59+01:00`));

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

const refresh = () => revalidatePath("/admin/marketing", "layout");

const fail = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof Error ? error.message : fallback,
});

// ── Cupões (o checkout valida-os com couponDiscount) ──

const couponSchema = z
  .object({
    code: z.string().min(3, "O código tem pelo menos 3 letras ou números.").max(24),
    type: z.enum(COUPON_TYPES),
    value: z.number().int().min(0).max(10_000_000_000),
    minSubtotal: cents,
    maxDiscount: cents,
    startsAt: day,
    endsAt: optionalDay,
    usageLimit: z.number().int().min(0).max(1_000_000),
    firstOrderOnly: z.boolean(),
    active: z.boolean(),
  })
  .refine((c) => c.type !== "percent" || (c.value >= 1 && c.value <= 90), "A percentagem vai de 1 a 90 %.")
  .refine((c) => c.type !== "fixed" || c.value > 0, "Indica o valor do desconto.")
  .refine((c) => !c.endsAt || c.endsAt >= c.startsAt, "O fim tem de ser depois do início.");

export type CouponInput = z.input<typeof couponSchema>;

/** Cupão novo (isNew) ou alteração. O código é o id: não muda depois de criado. */
export async function saveCoupon(input: CouponInput, isNew: boolean): Promise<MarketingResult> {
  const user = await staffCan("marketing", "create");
  if (!user) return NO_PERMISSION;
  const parsed = couponSchema.safeParse({ ...input, code: normalizeCode(input.code) });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const c = parsed.data;
  const db = adminDb();
  const ref = db.collection("coupons").doc(c.code);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (isNew && snap.exists) throw new Error(`O cupão ${c.code} já existe.`);
      if (!isNew && !snap.exists) throw new Error("Este cupão já não existe.");
      tx.set(
        ref,
        {
          type: c.type,
          value: c.type === "free_delivery" ? 0 : c.value,
          minSubtotal: c.minSubtotal || null,
          maxDiscount: c.type === "percent" && c.maxDiscount ? c.maxDiscount : null,
          startsAt: atStart(c.startsAt),
          endsAt: c.endsAt ? atEnd(c.endsAt) : null,
          usageLimit: c.usageLimit || null,
          firstOrderOnly: c.firstOrderOnly,
          active: c.active,
          ...(isNew ? { usedCount: 0, createdAt: Timestamp.now(), createdBy: user.uid } : {}),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      audit(tx, user, isNew ? "coupon.created" : "coupon.updated", "coupons", c.code, c.code);
    });
    refresh();
    return { ok: true, id: c.code };
  } catch (error) {
    return fail(error, "Não foi possível guardar o cupão.");
  }
}

// ── Campanhas ──

const campaignSchema = z
  .object({
    name: z.string().trim().min(3, "Dá um nome à campanha.").max(80),
    channel: z.enum(CAMPAIGN_CHANNELS),
    startsAt: day,
    endsAt: optionalDay,
    couponCodes: z.array(z.string().max(24)).max(10),
    utmCampaign: z.string().trim().max(60),
    budget: cents,
    draft: z.boolean(),
    notes: z.string().trim().max(1000),
  })
  .refine((c) => !c.endsAt || c.endsAt >= c.startsAt, "O fim tem de ser depois do início.");

export type CampaignInput = z.input<typeof campaignSchema>;

/** Campanha nova (id vazio) ou alteração. Os resultados contam-se pelos cupões ligados. */
export async function saveCampaign(id: string | null, input: CampaignInput): Promise<MarketingResult> {
  const user = await staffCan("marketing", "create");
  if (!user) return NO_PERMISSION;
  const parsed = campaignSchema.safeParse({
    ...input,
    couponCodes: input.couponCodes.map(normalizeCode).filter(Boolean),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const db = adminDb();
  const ref = id ? db.collection("campaigns").doc(id) : db.collection("campaigns").doc();
  try {
    await db.runTransaction(async (tx) => {
      const coupons = await Promise.all(parsed.data.couponCodes.map((c) => tx.get(db.collection("coupons").doc(c))));
      const missing = coupons.find((c) => !c.exists);
      if (missing) throw new Error(`O cupão ${missing.id} não existe: cria-o primeiro em Cupões.`);
      tx.set(
        ref,
        {
          ...parsed.data,
          utmCampaign: parsed.data.utmCampaign || normalizeCode(parsed.data.name).toLowerCase(),
          ...(id ? {} : { createdAt: Timestamp.now(), createdBy: user.uid }),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      audit(tx, user, id ? "campaign.updated" : "campaign.created", "campaigns", ref.id, parsed.data.name);
    });
    refresh();
    return { ok: true, id: ref.id };
  } catch (error) {
    return fail(error, "Não foi possível guardar a campanha.");
  }
}

// ── Leads (funil) ──

const leadUpdate = z.object({
  stage: z.enum(LEAD_STAGES),
  lostReason: z.string().trim().max(200),
  assigneeId: z.string().max(60),
  note: z.string().trim().max(1000),
});

/** Avança o lead no funil, atribui e junta notas (as notas ficam com autor e hora). */
export async function updateLead(id: string, input: z.input<typeof leadUpdate>): Promise<MarketingResult> {
  const user = await staffCan("marketing", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = leadUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  const { stage, lostReason, assigneeId, note } = parsed.data;
  if (stage === "perdido" && lostReason.length < 3) return { ok: false, message: "Indica porque se perdeu o lead." };
  const db = adminDb();
  const ref = db.collection("leads").doc(id);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Este lead já não existe.");
      tx.update(ref, {
        stage,
        lostReason: stage === "perdido" ? lostReason : null,
        assigneeId: assigneeId || null,
        ...(note ? { notes: FieldValue.arrayUnion({ text: note, by: actorName(user), at: Timestamp.now() }) } : {}),
        updatedAt: Timestamp.now(),
      });
      if (stage !== snap.get("stage")) audit(tx, user, "lead.stage", "leads", id, `${snap.get("name")} → ${stage}`);
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível guardar o lead.");
  }
}

const leadNew = z.object({
  name: z.string().trim().min(2, "Indica o nome.").max(80),
  phone: z.string().trim().max(20),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido.")]),
  company: z.string().trim().max(80),
  source: z.enum(LEAD_SOURCES),
  interest: z.string().trim().max(120),
  message: z.string().trim().max(1000),
});

/** Lead que chegou por WhatsApp, telefone ou balcão (os do site entram sozinhos). */
export async function createLead(input: z.input<typeof leadNew>): Promise<MarketingResult> {
  const user = await staffCan("marketing", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = leadNew.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.phone && !d.email) return { ok: false, message: "Indica um telefone ou um email para contactar." };
  const ref = adminDb().collection("leads").doc();
  await ref.set({
    ...d,
    email: d.email || null,
    stage: "novo",
    assigneeId: user.uid,
    createdAt: Timestamp.now(),
    createdBy: user.uid,
    updatedAt: Timestamp.now(),
    searchTokens: searchTokens(d.name, d.phone, d.email, d.company),
  });
  refresh();
  return { ok: true, id: ref.id };
}

/** Tira um contacto da newsletter (a pedido da pessoa ou por o email não existir). */
export async function cancelSubscriber(id: string): Promise<MarketingResult> {
  const user = await staffCan("marketing", "edit");
  if (!user) return NO_PERMISSION;
  await adminDb()
    .collection("newsletterSubscribers")
    .doc(id)
    .update({ status: "cancelado", cancelledAt: Timestamp.now(), cancelledBy: user.uid });
  refresh();
  return { ok: true };
}

// ── Pop-ups ──

const popupSchema = z.object({
  name: z.string().trim().min(3, "Dá um nome ao pop-up (só para o painel).").max(60),
  trigger: z.enum(POPUP_TRIGGERS),
  delaySec: z.number().int().min(2).max(120),
  scrollPct: z.number().int().min(10).max(90),
  paths: z.array(z.string().regex(/^\/[\w/-]*$/, "As páginas começam por / (ex.: /orcamento).")).max(10),
  title: z.string().trim().min(3, "Escreve o título.").max(80),
  body: z.string().trim().max(300),
  ctaLabel: z.string().trim().max(30),
  ctaHref: z.union([z.literal(""), z.string().regex(/^(\/\S*|https:\/\/\S+)$/, "Ligação inválida.")]),
  couponCode: z.string().max(24),
  frequencyDays: z.number().int().min(1).max(90),
  active: z.boolean(),
});

export type PopupInput = z.input<typeof popupSchema>;

/** Pop-up novo ou alteração. Só um aparece por visita; com vários para a mesma página, o mais recente. */
export async function savePopup(id: string | null, input: PopupInput): Promise<MarketingResult> {
  const user = await staffCan("marketing", "create");
  if (!user) return NO_PERMISSION;
  const parsed = popupSchema.safeParse({ ...input, couponCode: normalizeCode(input.couponCode) });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const p = parsed.data;
  if (Boolean(p.ctaLabel) !== Boolean(p.ctaHref))
    return { ok: false, message: "O botão precisa de texto e de ligação." };
  const db = adminDb();
  const ref = id ? db.collection("popups").doc(id) : db.collection("popups").doc();
  try {
    await db.runTransaction(async (tx) => {
      if (p.couponCode && !(await tx.get(db.collection("coupons").doc(p.couponCode))).exists)
        throw new Error(`O cupão ${p.couponCode} não existe.`);
      tx.set(
        ref,
        {
          name: p.name,
          trigger: p.trigger,
          delaySec: p.delaySec,
          scrollPct: p.scrollPct,
          paths: p.paths,
          content: { title: p.title, body: p.body, cta: p.ctaLabel, href: p.ctaHref },
          couponCode: p.couponCode || null,
          frequencyDays: p.frequencyDays,
          active: p.active,
          ...(id ? {} : { stats: { views: 0, conversions: 0 }, createdAt: Timestamp.now(), createdBy: user.uid }),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      audit(tx, user, id ? "popup.updated" : "popup.created", "popups", ref.id, p.name);
    });
    updateTag(MARKETING_TAG);
    refresh();
    return { ok: true, id: ref.id };
  } catch (error) {
    return fail(error, "Não foi possível guardar o pop-up.");
  }
}
