import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { whatsappLink } from "@/content/company";
import { getServices } from "@/features/catalog/server";
import { getCompany } from "@/features/settings/server";
import { NewsletterForm } from "@/features/marketing/components/newsletter-form";
import { formatPhone } from "@/lib/domain/phone";
import { Logo } from "./logo";

const COMPANY_LINKS = [
  { href: "/sobre", label: "Sobre a Endju" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "Perguntas frequentes" },
  { href: "/contacto", label: "Contacto" },
];

const CLIENT_LINKS = [
  { href: "/orcamento", label: "Orçamento online" },
  { href: "/orcamento/personalizado", label: "Trabalho personalizado" },
  { href: "/conta/pedidos", label: "Acompanhar pedido" },
  { href: "/entrar", label: "Entrar" },
  { href: "/registar", label: "Criar conta" },
];

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <h2 className="eyebrow text-ink-3">{title}</h2>
      {children}
    </div>
  );
}

const linkClass = "text-sm text-ink-2 transition-colors hover:text-ink";

export async function SiteFooter() {
  const [services, COMPANY] = await Promise.all([getServices(), getCompany()]);
  const whatsapp = whatsappLink("Olá Endju, tenho uma pergunta.", COMPANY.whatsapp);
  return (
    <footer className="overflow-hidden border-t border-line">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] lg:gap-10">
        <div className="space-y-5">
          <Logo className="h-14" />
          <p className="max-w-xs text-sm text-ink-2">
            {COMPANY.tagline} em {COMPANY.city.split(",")[0]}. Design, impressão e acabamento sob o mesmo teto, com
            entrega em Luanda e nas províncias.
          </p>
          <Link
            href="/orcamento"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink underline decoration-brand decoration-2 underline-offset-[6px]"
          >
            Pedir orçamento <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <NewsletterForm />
        </div>

        <Column title="Serviços">
          <ul className="space-y-2.5">
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={`/servicos/${service.slug}`} className={linkClass}>
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </Column>

        <Column title="Empresa">
          <ul className="space-y-2.5">
            {COMPANY_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Column>

        <Column title="Área do cliente">
          <ul className="space-y-2.5">
            {CLIENT_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Column>

        <Column title="Contacto">
          <address className="space-y-4 text-sm text-ink-2 not-italic">
            <p>{COMPANY.address ?? COMPANY.city}</p>
            {COMPANY.phone && (
              <p>
                <a href={`tel:${COMPANY.phone}`} className="hover:text-ink">
                  {formatPhone(COMPANY.phone)}
                </a>
              </p>
            )}
            {COMPANY.email && (
              <p>
                <a href={`mailto:${COMPANY.email}`} className="hover:text-ink">
                  {COMPANY.email}
                </a>
              </p>
            )}
            {whatsapp && (
              <p>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink hover:text-brand"
                >
                  WhatsApp
                </a>
              </p>
            )}
            <dl className="space-y-1">
              {COMPANY.hours.map((slot) => (
                <div key={slot.days} className="flex justify-between gap-4">
                  <dt>{slot.days}</dt>
                  <dd className="font-mono text-xs text-ink">{slot.time}</dd>
                </div>
              ))}
            </dl>
          </address>
        </Column>
      </div>

      {/* Assinatura gigante, cortada pelo fundo da página como uma impressão a sangrar */}
      <p
        aria-hidden
        className="container-page -mb-[0.18em] font-display text-[clamp(5rem,24vw,26rem)] leading-[0.8] font-extrabold tracking-[-0.05em] text-ink/[0.06] [font-stretch:75%] select-none"
      >
        endju
      </p>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-ink-3 md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 {COMPANY.name}
            {COMPANY.nif && ` · NIF ${COMPANY.nif}`}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/privacidade" className="hover:text-ink">
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos" className="hover:text-ink">
                Termos e condições
              </Link>
            </li>
            {COMPANY.socials.map((social) => (
              <li key={social.href}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="eyebrow">Preços em Kz · IVA 14 % incluído</p>
        </div>
      </div>
    </footer>
  );
}
