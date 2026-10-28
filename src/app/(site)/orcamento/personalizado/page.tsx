import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { QuoteRequestForm } from "@/features/quotes/components/quote-request-form";

export const metadata: Metadata = {
  title: "Orçamento personalizado",
  description:
    "Letreiros, fachadas, envelopamento de viaturas, kits para eventos e embalagens à medida: descreve o trabalho e recebe a proposta no mesmo dia útil.",
};

const EXAMPLES = [
  "Letreiros luminosos e letras 3D",
  "Fachadas e caixas de luz com montagem",
  "Envelopamento de viaturas",
  "Kits e brindes para eventos",
  "Embalagens com faca à medida",
  "Fardamento para equipas grandes",
];

export default function CustomQuotePage() {
  return (
    <>
      <PageHeader
        eyebrow="Orçamento personalizado"
        title="Conta-nos o trabalho. Fazemos a proposta."
        trail={[{ href: "/orcamento", label: "Orçamento" }]}
      >
        Para tudo o que não está no orçamento online. Respondemos no mesmo dia útil com preço, prazo e o que precisamos
        de ti.
      </PageHeader>
      <div className="container-page grid gap-16 pb-section lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-24">
        <section aria-label="Pedido de orçamento">
          <QuoteRequestForm />
        </section>
        <aside className="space-y-4">
          <h2 className="eyebrow text-ink-3">Pedidos frequentes</h2>
          <ul className="border-t border-line">
            {EXAMPLES.map((example) => (
              <li key={example} className="border-b border-line py-3.5 text-ink-2">
                {example}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-3">
            Se já tens medidas, fotografias do local ou o logótipo, junta-os depois por WhatsApp com o número do pedido.
          </p>
        </aside>
      </div>
    </>
  );
}
