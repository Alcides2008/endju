import { COMPANY } from "./company";

/**
 * Entregas (docs/02 · settings/delivery). Passa para as Definições do painel na Etapa 6.
 * Valores de referência, com IVA: confirmar as taxas e os prazos com a Endju antes de publicar.
 */
export const PROVINCES = [
  "Bengo",
  "Benguela",
  "Bié",
  "Cabinda",
  "Cuando",
  "Cubango",
  "Cuanza Norte",
  "Cuanza Sul",
  "Cunene",
  "Huambo",
  "Huíla",
  "Ícolo e Bengo",
  "Luanda",
  "Lunda Norte",
  "Lunda Sul",
  "Malanje",
  "Moxico",
  "Moxico Leste",
  "Namibe",
  "Uíge",
  "Zaire",
] as const;
export type Province = (typeof PROVINCES)[number];

export const PICKUP_POINTS = [
  {
    id: "loja",
    name: "Loja Endju",
    address: COMPANY.address ?? "Luanda · enviamos a localização com o aviso de pronto",
    hours: COMPANY.hours.map((slot) => `${slot.days} ${slot.time}`).join(" · "),
  },
];

export const DELIVERY_ZONES = [
  { id: "luanda", name: "Luanda", provinces: ["Luanda"] as Province[], fee: 500_000, extraDays: 0 },
  {
    id: "arredores",
    name: "Bengo e Ícolo e Bengo",
    provinces: ["Ícolo e Bengo", "Bengo"] as Province[],
    fee: 1_000_000,
    extraDays: 1,
  },
  {
    id: "provincias",
    name: "Outras províncias (transportadora)",
    provinces: PROVINCES.filter((p) => !["Luanda", "Ícolo e Bengo", "Bengo"].includes(p)) as Province[],
    fee: 1_500_000,
    extraDays: 3,
  },
];

export function zoneForProvince(province: string) {
  return DELIVERY_ZONES.find((zone) => zone.provinces.includes(province as Province));
}

/** Sinal exigido para começar a produção (docs/04 · decisão 7). */
export const DEPOSIT_PCT = 50;
