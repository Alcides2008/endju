import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PopupTrigger } from "@/lib/domain/marketing";
import { adminDb } from "@/lib/firebase/admin";

/** Pop-ups ativos para o site, em cache até o painel guardar um (updateTag(MARKETING_TAG)). */
export const MARKETING_TAG = "marketing";

export type SitePopup = {
  id: string;
  trigger: PopupTrigger;
  delaySec: number;
  scrollPct: number;
  paths: string[];
  title: string;
  body: string;
  cta: { label: string; href: string } | null;
  couponCode: string | null;
  frequencyDays: number;
};

export async function getActivePopups(): Promise<SitePopup[]> {
  "use cache";
  cacheLife("max");
  cacheTag(MARKETING_TAG);
  const snap = await adminDb().collection("popups").where("active", "==", true).get();
  return snap.docs
    .sort((a, b) => (b.get("updatedAt")?.toMillis() ?? 0) - (a.get("updatedAt")?.toMillis() ?? 0))
    .map((d) => ({
      id: d.id,
      trigger: d.get("trigger"),
      delaySec: d.get("delaySec") ?? 8,
      scrollPct: d.get("scrollPct") ?? 50,
      paths: d.get("paths") ?? [],
      title: d.get("content.title"),
      body: d.get("content.body") ?? "",
      cta: d.get("content.cta") ? { label: d.get("content.cta"), href: d.get("content.href") } : null,
      couponCode: d.get("couponCode") ?? null,
      frequencyDays: d.get("frequencyDays") ?? 7,
    }));
}
