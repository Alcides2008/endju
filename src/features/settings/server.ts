import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { COMPANY, type CompanyInfo } from "@/content/company";
import { DELIVERY_ZONES, DEPOSIT_PCT, PICKUP_POINTS } from "@/content/delivery";
import { adminDb } from "@/lib/firebase/admin";

/** Definições do painel (docs/02 · settings), em cache até alguém as guardar (updateTag(SETTINGS_TAG)). */
export const SETTINGS_TAG = "settings";

export async function getCompany(): Promise<CompanyInfo> {
  "use cache";
  cacheLife("max");
  cacheTag(SETTINGS_TAG);
  const saved = (await adminDb().collection("settings").doc("company").get()).data() ?? {};
  const pick = <K extends keyof CompanyInfo>(key: K) => (key in saved ? (saved[key] as CompanyInfo[K]) : COMPANY[key]);
  return {
    ...COMPANY,
    address: pick("address"),
    phone: pick("phone"),
    whatsapp: pick("whatsapp"),
    email: pick("email"),
    nif: pick("nif"),
    hours: pick("hours"),
    socials: pick("socials"),
    banks: pick("banks"),
  };
}

export type Zone = (typeof DELIVERY_ZONES)[number] & { active: boolean };
export type Commerce = {
  depositPct: number;
  zones: Zone[];
  pickupPoints: { id: string; name: string; address: string; hours: string }[];
};

/** Sinal, taxas e prazos de entrega por zona, e o ponto de levantamento. */
export async function getCommerce(): Promise<Commerce> {
  "use cache";
  cacheLife("max");
  cacheTag(SETTINGS_TAG);
  const saved = (await adminDb().collection("settings").doc("commerce").get()).data() ?? {};
  const zones = (saved.zones ?? {}) as Record<string, { fee?: number; extraDays?: number; active?: boolean }>;
  const pickup = (saved.pickup ?? {}) as { address?: string; hours?: string };
  return {
    depositPct: typeof saved.depositPct === "number" ? saved.depositPct : DEPOSIT_PCT,
    zones: DELIVERY_ZONES.map((z) => ({
      ...z,
      fee: zones[z.id]?.fee ?? z.fee,
      extraDays: zones[z.id]?.extraDays ?? z.extraDays,
      active: zones[z.id]?.active ?? true,
    })),
    pickupPoints: PICKUP_POINTS.map((p) => ({
      ...p,
      address: pickup.address || p.address,
      hours: pickup.hours || p.hours,
    })),
  };
}

/** Zona ativa que serve uma província. */
export const zoneFor = (zones: Zone[], province: string) =>
  zones.find((z) => z.active && (z.provinces as readonly string[]).includes(province));
