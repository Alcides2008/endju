import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getProducts, getServices } from "@/features/catalog/server";
import { VestIllustration } from "@/features/configurator/components/vest-illustration";
import { defaultConfig, VEST_COLORS } from "@/lib/domain/catalog";
import { formatKzWhole } from "@/lib/domain/money";
import { priceItem } from "@/lib/domain/pricing";

export const metadata: Metadata = {
  title: "Orçamento online",
  description:
    "Configura cartões, flyers, roll-ups, lonas, vinil, caixas, coletes refletores, t-shirts e bonés e vê o preço em Kz na hora.",
};

export default async function QuotePage() {
  const [products, services] = await Promise.all([getProducts(), getServices()]);
  return (
    <>
      <PageHeader eyebrow="Orçamento online" title="Escolhe, configura e vê o preço na hora.">
        Formato, material, quantidade e prazo: o preço atualiza enquanto escolhes, com IVA incluído. Para trabalhos fora
        do catálogo, pede um orçamento personalizado.
      </PageHeader>

      <div className="container-page space-y-16 pb-section">
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const from = priceItem(product, defaultConfig(product));
            const service = services.find((s) => s.slug === product.serviceSlug);
            return (
              <li key={product.slug} className="reveal">
                <Link
                  href={`/orcamento/${product.slug}`}
                  data-cursor-label="Configurar"
                  className="group block space-y-4"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-line bg-paper-2">
                    {product.image ? (
                      <Image
                        src={product.image.src}
                        alt={product.image.alt}
                        fill
                        placeholder="blur"
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]"
                      />
                    ) : (
                      <VestIllustration
                        color={VEST_COLORS.amarelo}
                        className="absolute inset-0 m-auto h-[78%] w-auto"
                      />
                    )}
                  </div>
                  <p className="eyebrow text-ink-3">{service?.name}</p>
                  <h2 className="text-display-sm font-bold decoration-brand decoration-2 underline-offset-4 group-hover:underline">
                    {product.name}
                  </h2>
                  <p className="text-sm text-ink-2">{product.summary}</p>
                  <p className="flex items-center justify-between border-t border-line pt-3 text-sm">
                    <span>
                      <span className="text-ink-3">a partir de </span>
                      {/* Ao m², o "a partir de" é o preço do m² (a medida sugerida no configurador é só um exemplo) */}
                      <strong className="font-semibold">
                        {formatKzWhole(
                          product.pricing.model === "area_m2" ? (product.pricing.pricePerM2 ?? 0) : from.lineTotal,
                        )}
                      </strong>
                      <span className="text-ink-3">
                        {" "}
                        · {product.pricing.model === "area_m2" ? "por m²" : `${product.minQty} ${product.unit}`}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 text-ink-3 group-hover:text-brand" aria-hidden />
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/orcamento/personalizado"
          className="group flex flex-col gap-6 rounded-md border border-line bg-card p-8 md:flex-row md:items-center md:justify-between md:p-12"
        >
          <span className="flex items-start gap-5">
            <MessageSquareText className="mt-1 size-7 shrink-0 text-brand" aria-hidden />
            <span className="space-y-2">
              <span className="block text-display-sm font-bold">Precisas de algo fora do catálogo?</span>
              <span className="block max-w-xl text-ink-2">
                Letreiros, fachadas, envelopamento de viaturas, kits para eventos ou embalagens à medida: descreve o
                trabalho e respondemos no mesmo dia útil.
              </span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 font-medium underline decoration-brand decoration-2 underline-offset-[6px]">
            Pedir orçamento personalizado <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </Link>
      </div>
    </>
  );
}
