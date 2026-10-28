import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getAllFaqs } from "@/features/content/server";
import { FAQ_CATEGORIES } from "@/lib/domain/content";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Encomendas, ficheiros, provas, pagamentos, entregas e montagem: as respostas às perguntas que mais nos fazem.",
};

export default async function FaqPage() {
  const faqs = (await getAllFaqs()).filter((faq) => faq.active);
  const categories = FAQ_CATEGORIES.filter((c) => faqs.some((faq) => faq.category === c.id));
  return (
    <>
      <PageHeader eyebrow="Perguntas frequentes" title="Antes de perguntares.">
        Encomendas, ficheiros, pagamentos e entregas. Se a tua pergunta não estiver aqui,{" "}
        <Link href="/contacto" className="text-ink underline decoration-brand decoration-2 underline-offset-4">
          fala connosco
        </Link>
        .
      </PageHeader>

      <div className="container-page grid gap-12 pb-section lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-20">
        <nav aria-label="Temas" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {categories.map((category) => (
              <li key={category.id}>
                <a
                  href={`#${category.id}`}
                  className="inline-block rounded-full border border-line px-4 py-2 text-sm text-ink-2 hover:text-ink lg:rounded-none lg:border-0 lg:px-0 lg:py-1.5"
                >
                  {category.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-16">
          {categories.map((category) => (
            <section
              key={category.id}
              id={category.id}
              aria-labelledby={`${category.id}-titulo`}
              className="scroll-mt-28"
            >
              <h2 id={`${category.id}-titulo`} className="mb-4 eyebrow text-ink-3">
                {category.label}
              </h2>
              <div className="border-t border-line">
                {faqs
                  .filter((faq) => faq.category === category.id)
                  .map((faq) => (
                    <details key={faq.id} className="group border-b border-line">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
                        {faq.question}
                        <Plus
                          className="size-5 shrink-0 text-ink-3 transition-transform duration-300 group-open:rotate-45 group-open:text-brand"
                          aria-hidden
                        />
                      </summary>
                      <p className="max-w-2xl pb-6 text-ink-2">{faq.answer}</p>
                    </details>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
