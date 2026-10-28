import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/content/company";
import { getCompany } from "@/features/settings/server";
import { ContactForm } from "@/features/contact/components/contact-form";
import { formatPhone } from "@/lib/domain/phone";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Fala com a Endju: formulário, WhatsApp, telefone, morada e horário da loja em Luanda.",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-line pt-5">
      <h2 className="eyebrow text-ink-3">{title}</h2>
      {children}
    </div>
  );
}

export default async function ContactPage() {
  const COMPANY = await getCompany();
  const whatsapp = whatsappLink("Olá Endju, tenho uma pergunta.", COMPANY.whatsapp);
  const { coordinates } = COMPANY;
  // Caixa de ~1 km à volta da loja para o mapa do OpenStreetMap (sem cookies de terceiros nem chave de API)
  const bbox = coordinates
    ? [coordinates.lng - 0.006, coordinates.lat - 0.004, coordinates.lng + 0.006, coordinates.lat + 0.004].join(",")
    : null;

  return (
    <>
      <PageHeader eyebrow="Contacto" title="Fala connosco.">
        Conta-nos o que precisas e respondemos no mesmo dia útil. Para orçamentos com preço na hora, usa o orçamento
        online.
      </PageHeader>

      <div className="container-page grid gap-16 pb-section lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-24">
        <section aria-label="Formulário de contacto">
          <ContactForm />
        </section>

        <aside className="space-y-8">
          {whatsapp && (
            <Button asChild size="lg" className="w-full">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> Falar no WhatsApp
              </a>
            </Button>
          )}

          <Block title="Loja">
            <address className="space-y-1 text-lg not-italic">
              <p>{COMPANY.address ?? COMPANY.city}</p>
              {COMPANY.phone && (
                <p>
                  <a href={`tel:${COMPANY.phone}`} className="hover:text-brand">
                    {formatPhone(COMPANY.phone)}
                  </a>
                </p>
              )}
              {COMPANY.email && (
                <p>
                  <a href={`mailto:${COMPANY.email}`} className="hover:text-brand">
                    {COMPANY.email}
                  </a>
                </p>
              )}
            </address>
          </Block>

          <Block title="Horário">
            <dl className="space-y-2">
              {COMPANY.hours.map((slot) => (
                <div key={slot.days} className="flex justify-between gap-4">
                  <dt className="text-ink-2">{slot.days}</dt>
                  <dd className="font-mono text-sm">{slot.time}</dd>
                </div>
              ))}
            </dl>
          </Block>

          {COMPANY.socials.length > 0 && (
            <Block title="Redes sociais">
              <ul className="flex flex-wrap gap-2">
                {COMPANY.socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-full border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:border-ink hover:text-ink"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {coordinates && bbox && (
            <Block title="Mapa">
              <iframe
                title={`Mapa com a localização da ${COMPANY.name}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coordinates.lat},${coordinates.lng}`}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-sm border border-line grayscale-[0.3]"
              />
              <a
                href={`https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=17/${coordinates.lat}/${coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm underline underline-offset-4"
              >
                Abrir o mapa num separador novo
              </a>
            </Block>
          )}
        </aside>
      </div>
    </>
  );
}
