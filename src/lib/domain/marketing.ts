import type { Tone } from "./order-status";

/** Marketing (docs/02 · Marketing): funil de leads, cupões, campanhas, newsletter e pop-ups. Regras puras. */

export const LEAD_STAGES = ["novo", "contactado", "qualificado", "proposta", "ganho", "perdido"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
export const LEAD_STAGE_META: Record<LeadStage, { label: string; tone: Tone }> = {
  novo: { label: "Novo", tone: "brand" },
  contactado: { label: "Contactado", tone: "info" },
  qualificado: { label: "Qualificado", tone: "process" },
  proposta: { label: "Proposta enviada", tone: "warning" },
  ganho: { label: "Ganho", tone: "success" },
  perdido: { label: "Perdido", tone: "neutral" },
};

export const LEAD_SOURCES = ["contacto", "orcamento", "popup", "newsletter", "whatsapp", "telefone", "balcao"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  contacto: "Formulário de contacto",
  orcamento: "Orçamento personalizado",
  popup: "Pop-up do site",
  newsletter: "Newsletter",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  balcao: "Balcão",
};

export const COUPON_TYPES = ["percent", "fixed", "free_delivery"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];
export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  percent: "Percentagem dos produtos",
  fixed: "Valor fixo (Kz)",
  free_delivery: "Entrega grátis",
};

/** Códigos de cupão: maiúsculas, números e hífenes ("NATAL-26"). Servem de id do documento. */
export const normalizeCode = (code: string) =>
  code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");

export const CAMPAIGN_CHANNELS = ["whatsapp", "redes", "email", "site", "balcao"] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];
export const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  whatsapp: "WhatsApp",
  redes: "Redes sociais",
  email: "Email",
  site: "Site",
  balcao: "Loja",
};

/** Estado da campanha pelas datas: rascunho só quando foi guardada como tal. */
export function campaignStatus(c: { draft: boolean; startsAt: string; endsAt: string }, today: string) {
  if (c.draft) return "rascunho" as const;
  if (today < c.startsAt) return "agendada" as const;
  if (c.endsAt && today > c.endsAt) return "terminada" as const;
  return "ativa" as const;
}

/** Resultado de uma campanha: pedidos com os cupões dela, dentro das datas (os cancelados não contam). */
export function campaignResults(
  campaign: { couponCodes: string[]; startsAt: string; endsAt: string },
  orders: { code: string; day: string; total: number; discount: number; status: string }[],
) {
  const codes = new Set(campaign.couponCodes);
  const hits = orders.filter(
    (o) =>
      codes.has(o.code) &&
      o.status !== "cancelado" &&
      o.day >= campaign.startsAt &&
      (!campaign.endsAt || o.day <= campaign.endsAt),
  );
  return {
    orders: hits.length,
    revenue: hits.reduce((s, o) => s + o.total, 0),
    discount: hits.reduce((s, o) => s + o.discount, 0),
  };
}

export const POPUP_TRIGGERS = ["tempo", "scroll", "saida"] as const;
export type PopupTrigger = (typeof POPUP_TRIGGERS)[number];
export const POPUP_TRIGGER_LABELS: Record<PopupTrigger, string> = {
  tempo: "Depois de alguns segundos",
  scroll: "Depois de descer parte da página",
  saida: "Quando o rato sai da página (computador)",
};

/** A página bate com a lista? "/" é só a Home; "/orcamento" inclui as páginas de baixo; vazia = todas. */
export function pathMatches(paths: string[], pathname: string) {
  if (paths.length === 0) return true;
  return paths.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}

/** Já pode voltar a aparecer a quem a viu? */
export const popupDue = (lastShown: number | null, frequencyDays: number, now: number) =>
  lastShown === null || now - lastShown >= frequencyDays * 86_400_000;
