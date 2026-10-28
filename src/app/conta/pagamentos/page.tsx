import type { Metadata } from "next";
import Link from "next/link";
import { PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/content/company";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { listMyOrders } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatKz } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Pagamentos" };

export default async function PaymentsPage() {
  const user = await requireCustomer("/conta/pagamentos");
  const orders = (await listMyOrders(user.uid)).filter((order) => order.status !== "cancelado");
  const pending = orders.filter((order) => order.totals.due > 0);
  const paid = orders.filter((order) => order.totals.paid > 0);

  return (
    <div className="space-y-10">
      <AccountHeading title="Pagamentos">
        O sinal de cada pedido põe a produção a andar; o restante paga-se na entrega ou no levantamento.
      </AccountHeading>

      <section aria-labelledby="pendentes" className="space-y-4">
        <h2 id="pendentes" className="text-lg font-semibold">
          Por pagar
        </h2>
        {pending.length === 0 ? (
          <EmptyState title="Nada por pagar." />
        ) : (
          <ul className="space-y-3">
            {pending.map((order) => {
              const depositLeft = Math.max(order.depositRequired - order.totals.paid, 0);
              const whatsapp = whatsappLink(
                `Olá Endju, quero pagar ${depositLeft > 0 ? "o sinal" : "o restante"} do pedido ${order.number} (${formatKz(depositLeft || order.totals.due)}).`,
              );
              return (
                <li
                  key={order.id}
                  className="grid gap-4 rounded-sm border border-line bg-card p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="space-y-1">
                    <p className="flex flex-wrap items-center gap-3">
                      <Link href={`/conta/pedidos/${order.number}`} className="font-mono text-sm hover:underline">
                        {order.number}
                      </Link>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </p>
                    <p className="text-sm text-ink-2">
                      {depositLeft > 0 ? (
                        <>
                          Sinal em falta: <strong className="text-ink">{formatKz(depositLeft)}</strong> · total em falta{" "}
                          {formatKz(order.totals.due)}
                        </>
                      ) : (
                        <>
                          Restante a pagar na entrega:{" "}
                          <strong className="text-ink">{formatKz(order.totals.due)}</strong>
                        </>
                      )}
                    </p>
                  </div>
                  {whatsapp && (
                    <Button asChild size="sm">
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                        Combinar pagamento
                      </a>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-ink-3">
          Aceitamos Multicaixa Express, pagamento por referência e transferência bancária. Enquanto o pagamento online
          não está disponível no site, combinamos contigo por WhatsApp e confirmamos aqui quando recebermos.
        </p>
      </section>

      {paid.length > 0 && (
        <section aria-labelledby="historico" className="space-y-4">
          <h2 id="historico" className="text-lg font-semibold">
            Já pago
          </h2>
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {paid.map((order) => (
              <li key={order.id} className="flex justify-between gap-4 p-4 text-sm">
                <span className="font-mono">{order.number}</span>
                <span>{formatKz(order.totals.paid)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
