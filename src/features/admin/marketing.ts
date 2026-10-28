import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { dayKey } from "@/lib/domain/finance";
import {
  campaignResults,
  type CampaignChannel,
  type CouponType,
  type LeadSource,
  type LeadStage,
  type PopupTrigger,
} from "@/lib/domain/marketing";
import { adminDb } from "@/lib/firebase/admin";

/** Leituras do Marketing para o painel. shortcut: listas até 300–500 registos; com mais, paginar. */
const toDate = (t: unknown) => (t as Timestamp | undefined)?.toDate() ?? null;
const day = (t: unknown) => {
  const d = toDate(t);
  return d ? dayKey(d) : "";
};

export type CouponRow = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal: number;
  maxDiscount: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  active: boolean;
};

export async function listCoupons(): Promise<CouponRow[]> {
  const snap = await adminDb().collection("coupons").get();
  return snap.docs
    .map((d) => ({
      code: d.id,
      type: d.get("type"),
      value: d.get("value") ?? 0,
      minSubtotal: d.get("minSubtotal") ?? 0,
      maxDiscount: d.get("maxDiscount") ?? 0,
      startsAt: day(d.get("startsAt")),
      endsAt: day(d.get("endsAt")),
      usageLimit: d.get("usageLimit") ?? null,
      usedCount: d.get("usedCount") ?? 0,
      firstOrderOnly: Boolean(d.get("firstOrderOnly")),
      active: Boolean(d.get("active")),
    }))
    .sort((a, b) => Number(b.active) - Number(a.active) || b.startsAt.localeCompare(a.startsAt));
}

export type CampaignRow = {
  id: string;
  name: string;
  channel: CampaignChannel;
  startsAt: string;
  endsAt: string;
  couponCodes: string[];
  utmCampaign: string;
  budget: number;
  draft: boolean;
  notes: string;
  results: { orders: number; revenue: number; discount: number };
};

/** Campanhas com o resultado contado nos pedidos que usaram os cupões delas. */
export async function listCampaigns(): Promise<CampaignRow[]> {
  const db = adminDb();
  const snap = await db.collection("campaigns").get();
  const campaigns = snap.docs.map((d) => ({
    id: d.id,
    name: d.get("name"),
    channel: d.get("channel"),
    startsAt: d.get("startsAt") ?? "",
    endsAt: d.get("endsAt") ?? "",
    couponCodes: (d.get("couponCodes") ?? []) as string[],
    utmCampaign: d.get("utmCampaign") ?? "",
    budget: d.get("budget") ?? 0,
    draft: Boolean(d.get("draft")),
    notes: d.get("notes") ?? "",
  }));
  const codes = [...new Set(campaigns.flatMap((c) => c.couponCodes))];
  const orders: { code: string; day: string; total: number; discount: number; status: string }[] = [];
  for (let i = 0; i < codes.length; i += 30) {
    const chunk = await db
      .collection("orders")
      .where("coupon.code", "in", codes.slice(i, i + 30))
      .get();
    for (const o of chunk.docs)
      orders.push({
        code: o.get("coupon.code"),
        day: day(o.get("createdAt")),
        total: o.get("totals.total") ?? 0,
        discount: o.get("coupon.discount") ?? 0,
        status: o.get("status"),
      });
  }
  return campaigns
    .map((c) => ({ ...c, results: campaignResults(c, orders) }))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  source: LeadSource;
  interest: string;
  message: string;
  stage: LeadStage;
  lostReason: string;
  assigneeId: string;
  quoteId: string;
  notes: { text: string; by: string; at: string }[];
  createdAt: Date | null;
};

export async function listLeads(): Promise<LeadRow[]> {
  const snap = await adminDb().collection("leads").orderBy("createdAt", "desc").limit(300).get();
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.get("name") ?? "",
    phone: d.get("phone") ?? "",
    email: d.get("email") ?? "",
    company: d.get("company") ?? "",
    source: d.get("source") ?? "contacto",
    interest: d.get("interest") ?? "",
    message: d.get("message") ?? "",
    stage: d.get("stage") ?? "novo",
    lostReason: d.get("lostReason") ?? "",
    assigneeId: d.get("assigneeId") ?? "",
    quoteId: d.get("quoteId") ?? "",
    notes: ((d.get("notes") ?? []) as { text: string; by: string; at: Timestamp }[]).map((n) => ({
      text: n.text,
      by: n.by,
      at: n.at?.toDate().toISOString() ?? "",
    })),
    createdAt: toDate(d.get("createdAt")),
  }));
}

export type SubscriberRow = {
  id: string;
  email: string;
  name: string;
  status: string;
  source: string;
  createdAt: Date | null;
  confirmedAt: Date | null;
};

export async function listSubscribers(): Promise<SubscriberRow[]> {
  const snap = await adminDb().collection("newsletterSubscribers").orderBy("createdAt", "desc").limit(500).get();
  return snap.docs.map((d) => ({
    id: d.id,
    email: d.get("email"),
    name: d.get("name") ?? "",
    status: d.get("status"),
    source: d.get("source") ?? "",
    createdAt: toDate(d.get("createdAt")),
    confirmedAt: toDate(d.get("confirmedAt")),
  }));
}

export type PopupDoc = {
  id: string;
  name: string;
  trigger: PopupTrigger;
  delaySec: number;
  scrollPct: number;
  paths: string[];
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  couponCode: string;
  frequencyDays: number;
  active: boolean;
  views: number;
  conversions: number;
};

export async function listPopups(): Promise<PopupDoc[]> {
  const snap = await adminDb().collection("popups").get();
  return snap.docs.map((d) => ({
    id: d.id,
    name: d.get("name"),
    trigger: d.get("trigger"),
    delaySec: d.get("delaySec") ?? 8,
    scrollPct: d.get("scrollPct") ?? 50,
    paths: d.get("paths") ?? [],
    title: d.get("content.title") ?? "",
    body: d.get("content.body") ?? "",
    ctaLabel: d.get("content.cta") ?? "",
    ctaHref: d.get("content.href") ?? "",
    couponCode: d.get("couponCode") ?? "",
    frequencyDays: d.get("frequencyDays") ?? 7,
    active: Boolean(d.get("active")),
    views: d.get("stats.views") ?? 0,
    conversions: d.get("stats.conversions") ?? 0,
  }));
}
