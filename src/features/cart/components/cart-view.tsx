"use client";

import Link from "next/link";
import { ArrowUpRight, CircleAlert, FileClock, Palette, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductBase } from "@/lib/domain/catalog";
import { formatKz } from "@/lib/domain/money";
import { useHydrated } from "@/lib/use-hydrated";
import { priceLine } from "../lines";
import { cart, useCart } from "../store";

export function CartView({ products }: { products: ProductBase[] }) {
  const items = useCart();
  const hydrated = useHydrated();
  const lines = items.map((item) => priceLine(item, products));
  const total = lines.reduce((sum, line) => sum + (line.ok ? line.price.lineTotal : 0), 0);
  const invalid = lines.some((line) => !line.ok);

  // O carrinho vive no browser: até a página hidratar, não se sabe se está vazio
  if (!hydrated) return <Skeleton className="h-64 w-full" />;

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line px-6 py-20 text-center">
        <p className="text-display-sm font-bold">O carrinho está vazio.</p>
        <p className="mt-3 text-ink-2">Escolhe um produto, configura-o e vê o preço na hora.</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/orcamento">
            Ver produtos <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
      <ul className="border-t border-line">
        {lines.map((line) => (
          <li key={line.item.id} className="grid gap-4 border-b border-line py-6 sm:grid-cols-[minmax(0,1fr)_auto]">
            {line.ok ? (
              <>
                <div className="space-y-2">
                  <Link href={`/orcamento/${line.product.slug}`} className="text-lg font-semibold hover:text-brand">
                    {line.name}
                  </Link>
                  <p className="text-sm text-ink-2">{line.details.join(" · ")}</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
                    {line.item.urgent && (
                      <li className="flex items-center gap-1 text-warning">
                        <Zap className="size-3.5" aria-hidden /> Urgente
                      </li>
                    )}
                    <li className="flex items-center gap-1">
                      {line.item.design === "endju_cria" ? (
                        <>
                          <Palette className="size-3.5" aria-hidden /> Design pela Endju
                        </>
                      ) : (
                        <>
                          <FileClock className="size-3.5" aria-hidden />
                          {line.item.artwork ? `Ficheiro: ${line.item.artwork.name}` : "Ficheiro a enviar depois"}
                        </>
                      )}
                    </li>
                    {line.item.notes && <li>Nota: {line.item.notes}</li>}
                  </ul>
                </div>
                <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-start">
                  <label className="flex items-center gap-2 text-sm text-ink-3">
                    <span className="sr-only">Quantidade de {line.name}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={line.product.minQty}
                      value={line.item.quantity}
                      onChange={(event) => {
                        const quantity = Number(event.target.value);
                        if (Number.isInteger(quantity) && quantity > 0) cart.update(line.item.id, { quantity });
                      }}
                      className="h-10 w-24 rounded-full border border-line bg-card px-4 text-ink outline-none focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-brand/20"
                    />
                    {line.product.unit}
                  </label>
                  <p className="font-semibold">{formatKz(line.price.lineTotal)}</p>
                </div>
              </>
            ) : (
              <p role="alert" className="flex items-start gap-2 text-sm text-danger">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {line.error}
              </p>
            )}
            <button
              type="button"
              onClick={() => cart.remove(line.item.id)}
              className="flex w-fit items-center gap-1.5 text-sm text-ink-3 hover:text-danger sm:col-span-2"
            >
              <Trash2 className="size-4" aria-hidden /> Remover
            </button>
          </li>
        ))}
      </ul>

      <aside className="h-fit space-y-5 rounded-md border border-line bg-card p-6 lg:sticky lg:top-24">
        <div className="flex items-end justify-between gap-4">
          <p className="text-sm text-ink-2">Produtos, IVA incluído</p>
          <p className="text-display-sm font-bold">{formatKz(total)}</p>
        </div>
        <p className="text-sm text-ink-3">A entrega e os cupões de desconto são calculados no passo seguinte.</p>
        {invalid && <p className="text-sm text-danger">Remove ou corrige os produtos assinalados para continuar.</p>}
        {invalid ? (
          <Button size="lg" className="w-full" disabled>
            Finalizar encomenda
          </Button>
        ) : (
          <Button asChild size="lg" className="w-full">
            <Link href="/checkout">
              Finalizar encomenda <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        )}
        <Link href="/orcamento" className="block text-center text-sm text-ink-2 hover:text-ink">
          Continuar a escolher
        </Link>
      </aside>
    </div>
  );
}
