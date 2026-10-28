import type { CompanyInfo } from "@/content/company";
import type { Service } from "@/lib/domain/catalog";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Dados estruturados da loja (schema.org LocalBusiness): só com os campos que a Endju já confirmou. */
export function localBusinessLd(company: CompanyInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#empresa`,
    name: company.name,
    description: company.tagline,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/endju-logo.png`,
    image: `${SITE_URL}/opengraph-image`,
    ...(company.phone ? { telephone: company.phone } : {}),
    ...(company.email ? { email: company.email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(company.address ? { streetAddress: company.address } : {}),
      addressLocality: "Luanda",
      addressCountry: "AO",
    },
    ...(company.coordinates
      ? { geo: { "@type": "GeoCoordinates", latitude: company.coordinates.lat, longitude: company.coordinates.lng } }
      : {}),
    currenciesAccepted: "AOA",
    sameAs: company.socials.map((s) => s.href),
  };
}

/** Serviço como Product com o preço "a partir de" (cêntimos para kwanzas, IVA incluído). */
export function serviceLd(service: Pick<Service, "slug" | "name" | "summary" | "priceFrom">) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: service.name,
    description: service.summary,
    url: `${SITE_URL}/servicos/${service.slug}`,
    brand: { "@id": `${SITE_URL}/#empresa` },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: service.priceFrom / 100,
      priceCurrency: "AOA",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#empresa` },
    },
  };
}

/** JSON para dentro de <script>: escapa "<" para um texto do painel nunca fechar a tag. */
export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
