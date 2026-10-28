import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileClock, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/content/company";
import { AccountHeading } from "@/features/account/components/account-heading";
import { CancelOrderButton, ReorderButton } from "@/features/account/components/order-actions";
import { OrderLive } from "@/features/account/components/order-live";
import { getMyOrder } from "@/features/account/server";
import { getProducts } from "@/features/catalog/server";
import { PayBox, type OpenPayment } from "@/features/payments/components/pay-box";
import { getCompany } from "@/features/settings/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatPhone } from "@/lib/domain/phone";
import { adminDb } from "@/lib/firebase/admin";
import { isTestMode, onlinePaymentsEnabled } from "@/lib/payments/provider";
import { formatDate, formatDateTime, formatWeekday } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { customerCanCancel, type ProofStatus } from "@/lib/domain/order-status";

export async function generateMetadata({ params }: PageProps<"/conta/pedidos/[numero]">): Promise<Metadata> {
  return { title: `Pedido ${(await params).numero}` };
}

const PROOF_LABEL: Record<
  ProofStatus,
  { label: string; tone: "neutral" | "warning" | "success" | "info" | "process" }
> = {
  nao_necessaria: { label: "Sem prova", tone: "neutral" },
  pendente: { label: "Prova em preparação", tone: "neutral" },
  enviada: { label: "Prova por aprovar", tone: "warning" },
  aprovada: { label: "Prova aprovada", tone: "success" },
  alteracoes: { label: "Alterações pedidas", tone: "process" },
};

export default async function OrderPage({ params }: PageProps<"/conta/pedidos/[numero]">) {
  const user = await requireCustomer("/conta/pedidos");
  const order = await getMyOrder((await params).numero, user.uid);
  if (!order) notFound();
  const [company, paymentsSnap] = await Promise.all([
    getCompany(),
    adminDb().collection("payments").where("orderId", "==", order.id).get(),
  ]);
  const now = new Date().getTime();
  const depositMissing = Math.max(0, order.depositRequired - order.totals.paid);
  // Pagar só depois de a prova estar aprovada ou o pedido avançar; cancelado ou pago, nada a pagar
  const payable =
    order.status !== "cancelado" && order.totals.due > 0
      ? {
          label:
            depositMissing > 0 ? `o sinal · ${formatKz(depositMissing)}` : `o restante · ${formatKz(order.totals.due)}`,
        }
      : null;
  const openPayments: OpenPayment[] = paymentsSnap.docs
    .filter((p) => ["pendente", "aguarda_validacao"].includes(p.get("status")))
    .filter((p) => !p.get("provider.expiresAt") || p.get("provider.expiresAt").toMillis() > now)
    .map((p) => ({
      id: p.id,
      method: p.get("method"),
      amount: p.get("amount"),
      status: p.get("status"),
      entity: p.get("provider.entity") ?? undefined,
      reference: p.get("provider.reference") ?? undefined,
      phone: p.get("provider.phone") ? formatPhone(p.get("provider.phone")) : undefined,
      expiresAt: p.get("provider.expiresAt") ? formatDateTime(p.get("provider.expiresAt").toDate()) : undefined,
    }));

  const needsFiles = order.items.some((item) => item.design === "cliente_envia" && item.proofStatus === "pendente");
  const whatsapp = whatsappLink(`Olá Endju, tenho uma pergunta sobre o pedido ${order.number}.`);

  return (
    <div className="space-y-10">
      <AccountHeading
        back={{ href: "/conta/pedidos", label: "Pedidos" }}
        title={<span className="font-mono">{order.number}</span>}
        action={
          <div className="flex flex-wrap gap-2">
            {customerCanCancel({ status: order.status, paid: order.totals.paid }) && (
              <CancelOrderButton orderId={order.id} />
            )}
            <ReorderButton
              catalog={(await getProducts()).map((p) => p.slug)}
              items={order.items.map((item) => ({
                productId: item.productId,
                options: item.options,
                size: item.size,
                quantity: item.quantity,
                urgent: item.urgent,
                design: item.design,
                notes: item.notes,
              }))}
            />
          </div>
        }
      >
        Feito a {formatDate(order.createdAt)} · pronto previsto a {formatWeekday(order.dueAt)}, contado da aprovação da
        prova e do sinal.
      </AccountHeading>

      <OrderLive
        orderId={order.id}
        initial={{
          status: order.status,
          paymentStatus: order.paymentStatus,
          awaitingDeposit: false,
          events: order.events.map((e) => ({ id: e.id, message: e.message, at: e.at })),
        }}
      />

      {payable && (
        <PayBox
          orderNumber={order.number}
          amountLabel={payable.label}
          open={openPayments}
          banks={company.banks}
          testMode={isTestMode()}
          online={onlinePaymentsEnabled()}
        />
      )}

      {needsFiles && whatsapp && (
        <div className="flex flex-col gap-4 rounded-sm border border-warning/40 bg-warning/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Ainda não recebemos todos os ficheiros. Envia-os por WhatsApp com o número <strong>{order.number}</strong>.
          </p>
          <Button asChild size="sm">
            <a
              href={whatsappLink(`Olá Endju, envio os ficheiros do pedido ${order.number}.`) ?? whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar ficheiros
            </a>
          </Button>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="itens">
          <h2 id="itens" className="mb-4 text-lg font-semibold">
            Produtos
          </h2>
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {order.items.map((item) => (
              <li key={item.id} className="space-y-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-medium">
                    {item.name} × {item.quantity}
                  </p>
                  <p className="font-mono text-sm">{formatKz(item.lineTotal)}</p>
                </div>
                <p className="text-sm text-ink-2">
                  {[
                    item.size && `${item.size.widthCm} × ${item.size.heightCm} cm`,
                    ...item.options.map((o) => o.choiceLabel),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
                  <Badge tone={PROOF_LABEL[item.proofStatus].tone}>{PROOF_LABEL[item.proofStatus].label}</Badge>
                  <span className="flex items-center gap-1">
                    {item.design === "endju_cria" ? (
                      <>
                        <Palette className="size-3.5" aria-hidden /> Design pela Endju
                      </>
                    ) : (
                      <>
                        <FileClock className="size-3.5" aria-hidden />
                        {item.artworkCheck ? `Ficheiro: ${item.artworkCheck.name}` : "Ficheiro por enviar"}
                      </>
                    )}
                  </span>
                  {item.urgent && <span className="text-warning">Urgente</span>}
                  {item.currentProofId && (
                    <Link
                      href={`/conta/provas/${item.currentProofId}`}
                      className="font-medium text-brand underline-offset-4 hover:underline"
                    >
                      Ver prova
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="h-fit space-y-4 rounded-sm border border-line bg-card p-5 text-sm">
          <h2 className="text-base font-semibold">Valores</h2>
          <dl className="space-y-1.5 text-ink-2">
            <div className="flex justify-between">
              <dt>Produtos</dt>
              <dd className="font-mono text-xs">{formatKz(order.totals.items)}</dd>
            </div>
            {order.totals.discount > 0 && (
              <div className="flex justify-between">
                <dt>Desconto{order.coupon && ` (${order.coupon.code})`}</dt>
                <dd className="font-mono text-xs">−{formatKz(order.totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>{order.delivery.method === "entrega" ? "Entrega" : "Levantamento"}</dt>
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
            <div className="flex justify-between">
              <dt>Pago</dt>
              <dd className="font-mono text-xs">{formatKz(order.totals.paid)}</dd>
            </div>
            <div className="flex justify-between font-medium text-ink">
              <dt>Em falta</dt>
              <dd className="font-mono text-xs">{formatKz(order.totals.due)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Sinal para produzir</dt>
              <dd className="font-mono text-xs">{formatKz(order.depositRequired)}</dd>
            </div>
          </dl>
          {order.delivery.address && (
            <p className="border-t border-line pt-4 text-ink-2">
              Entrega a {order.delivery.address.recipient}: {order.delivery.address.street},{" "}
              {order.delivery.address.neighborhood}, {order.delivery.address.municipality},{" "}
              {order.delivery.address.province}.
            </p>
          )}
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/pdf/proforma/${encodeURIComponent(order.number)}`}>Descarregar pro-forma (PDF)</a>
            </Button>
            {paymentsSnap.docs
              .filter((p) => p.get("status") === "confirmado")
              .map((p) => (
                <Button key={p.id} asChild variant="ghost" size="sm">
                  <a href={`/api/pdf/recibo/${p.id}`}>Recibo de {formatKz(p.get("amount"))}</a>
                </Button>
              ))}
            {whatsapp && (
              <Button asChild variant="ghost" size="sm">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  Falar sobre este pedido
                </a>
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
