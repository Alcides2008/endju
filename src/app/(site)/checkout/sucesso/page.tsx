import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { whatsappLink } from "@/content/company";
import { getOwnOrder } from "@/features/orders/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatKz } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Pedido recebido", robots: { index: false } };

// Sessão e número do pedido são lidos por pedido: ficam dentro de Suspense.
// O número vai em ?pedido= e não no caminho, para o cabeçalho do site (que lê o endereço) ser pré-renderizado.
async function Receipt({ searchParams }: Pick<PageProps<"/checkout/sucesso">, "searchParams">) {
  const pedido = (await searchParams).pedido;
  const numero = typeof pedido === "string" ? pedido : "";
  const user = await requireCustomer(`/checkout/sucesso?pedido=${encodeURIComponent(numero)}`);
  const order = numero ? await getOwnOrder(numero, user.uid) : null;
  if (!order) notFound();

  const needsFiles = order.items.some((item) => item.design === "cliente_envia");
  const whatsapp = whatsappLink(`Olá Endju, envio os ficheiros do pedido ${order.number}.`);
  const due = new Intl.DateTimeFormat("pt-AO", { weekday: "long", day: "numeric", month: "long" }).format(order.dueAt);
  const steps = [
    needsFiles && {
      title: "Envia os ficheiros",
      text: `Manda as artes por WhatsApp com o número ${order.number}. Verificamos sangria, cores e resolução.`,
    },
    { title: "Aprovas a prova", text: "Enviamos a prova para aprovares. Estão incluídas 3 revisões." },
    {
      title: "Pagas o sinal",
      text: `${formatKz(order.depositRequired)} para a produção começar. Enviamos-te as instruções de pagamento.`,
    },
    { title: "Produzimos", text: `Pronto previsto a ${due}, contado da aprovação da prova e do sinal.` },
  ].filter(Boolean) as { title: string; text: string }[];

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
      <div className="space-y-10">
        <div className="space-y-5">
          <CircleCheck className="size-12 text-success" aria-hidden />
          <p className="eyebrow text-ink-3">Pedido {order.number}</p>
          <h1 className="text-display-lg font-extrabold [font-stretch:85%]">
            Obrigado, {order.customerName.split(" ")[0]}.
          </h1>
          <p className="max-w-xl text-lg text-ink-2">
            Recebemos o teu pedido. Guarda o número <strong className="text-ink">{order.number}</strong>: é por ele que
            falamos do teu trabalho.
          </p>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2">
          {steps.map((step, i) => (
            <li key={step.title} className="space-y-2 bg-card p-6">
              <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="font-semibold">{step.title}</h2>
              <p className="text-sm text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3">
          {needsFiles && whatsapp && (
            <Button asChild size="lg">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> Enviar ficheiros por WhatsApp
              </a>
            </Button>
          )}
          <Button asChild size="lg" variant="outline">
            <Link href="/orcamento">Continuar a encomendar</Link>
          </Button>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-md border border-line bg-card p-6">
        <h2 className="text-lg font-semibold">Resumo</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span>
                {item.name} × {item.quantity}
                {item.artworkName && <span className="block text-xs text-ink-3">Ficheiro: {item.artworkName}</span>}
              </span>
              <span className="shrink-0 font-mono text-xs">{formatKz(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line pt-4 text-sm text-ink-2">
          {order.totals.discount > 0 && (
            <div className="flex justify-between">
              <dt>Desconto</dt>
              <dd className="font-mono text-xs">−{formatKz(order.totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{order.delivery.method === "entrega" ? "Entrega" : "Levantamento na loja"}</dt>
            <dd className="font-mono text-xs">{order.delivery.fee ? formatKz(order.delivery.fee) : "grátis"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>IVA 14 % incluído</dt>
            <dd className="font-mono text-xs">{formatKz(order.totals.tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>{formatKz(order.totals.total)}</dd>
          </div>
        </dl>
        {order.delivery.address && (
          <p className="border-t border-line pt-4 text-sm text-ink-2">
            Entrega em {order.delivery.address.street}, {order.delivery.address.neighborhood},{" "}
            {order.delivery.address.municipality}, {order.delivery.address.province}.
          </p>
        )}
      </aside>
    </div>
  );
}

export default function OrderSuccessPage({ searchParams }: PageProps<"/checkout/sucesso">) {
  return (
    <div className="container-page pt-32 pb-section lg:pt-44">
      <Suspense fallback={<Skeleton className="h-[28rem] w-full" />}>
        <Receipt searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
