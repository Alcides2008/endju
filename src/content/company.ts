/**
 * Dados públicos da empresa: valores iniciais. Editam-se no painel (Definições → Empresa, settings/company) e o
 * servidor lê-os com getCompany(). Campos a null ficam escondidos no site (não se inventam contactos de uma
 * empresa real). shortcut: os componentes do browser que abrem o WhatsApp usam o número daqui.
 */
export const COMPANY = {
  name: "ENDJU BUSINESS",
  tagline: "Gráfica e estúdio de design",
  city: "Luanda, Angola",
  address: null as string | null,
  // Número único da Endju (telefone e WhatsApp), confirmado pela Endju
  phone: "+244946470573" as string | null, // E.164
  whatsapp: "244946470573" as string | null, // só dígitos para wa.me
  email: null as string | null,
  nif: null as string | null,
  /** Localização da loja para o mapa do Contacto (sem coordenadas, o mapa não aparece) */
  coordinates: null as { lat: number; lng: number } | null,
  // Horário provisório: confirmar com a Endju
  hours: [
    { days: "Segunda a sexta", time: "08h00 – 18h00" },
    { days: "Sábado", time: "09h00 – 13h00" },
  ],
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/endju.business/" },
    { label: "Facebook", href: "https://www.facebook.com/endjubusiness" },
  ] as { label: string; href: string }[],
  /** Contas para transferência, impressas na pro-forma e na proposta */
  banks: [] as { bank: string; iban: string; holder: string }[],
};

export type CompanyInfo = typeof COMPANY;

/** Ligação para o WhatsApp da Endju; no servidor passa-se o número das Definições (getCompany). */
export function whatsappLink(message: string, number = COMPANY.whatsapp) {
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
