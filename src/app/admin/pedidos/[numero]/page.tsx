import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, FileText, Printer, Zap } from "lucide-react";
import { Badge, OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountHeading } from "@/features/account/components/account-heading";
import {
  AssignControl,
  NoteControl,
  PaymentControl,
  StatusControl,
} from "@/features/admin/components/order-admin-panel";
import { WhatsAppSend } from "@/features/admin/components/communication-forms";
import { requireModule } from "@/features/admin/guard";
import { getAdminOrder, listStaff } from "@/features/admin/orders";
import { listOrderTasks } from "@/features/admin/production";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { formatPhone } from "@/lib/domain/phone";
import { SECTOR_LABELS, SECTORS, TASK_STATUS_META } from "@/lib/domain/production";

export async function generateMetadata({ params }: PageProps<"/admin/pedidos/[numero]">): Promise<Metadata> {
  return { title: `Pedido ${(await params).numero}` };
}

const PROOF: Record<string, { label: string; tone: "neutral" | "warning" | "success" | "process" }> = {
  nao_necessaria: { label: "Sem prova", tone: "neutral" },
  pendente: { label: "Prova por fazer", tone: "neutral" },
  enviada: { label: "Prova enviada", tone: "warning" },
  aprovada: { label: "Prova aprovada", tone: "success" },
  alteracoes: { label: "Alterações pedidas", tone: "process" },
};

const METHOD: Record<string, string> = {
  numerario: "Numerário",
  tpa: "TPA",
  transferencia: "Transferência",
  multicaixa_express: "Multicaixa Express",
  referencia: "Referência",
};

export default async function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[numero]">) {
  const user = await requireModule("orders", "view", "/admin/pedidos");
  const { numero } = await params;
  const [order, staff] = await Promise.all([getAdminOrder(numero), listStaff()]);
  if (!order) notFound();
  const tasks = (await listOrderTasks(order.id)).sort(
    (a, b) => a.itemName.localeCompare(b.itemName, "pt") || SECTORS.indexOf(a.sector) - SECTORS.indexOf(b.sector),
  );
  const canEdit = can(user, "orders", "edit");
  const canPay = can(user, "finance", "create") || can(user, "orders", "create");
  const canProof = can(user, "proofs", "create");
  const dueIso = order.dueAt ? order.dueAt.toISOString().slice(0, 10) : "";

  return (
    <div className="space-y-8">
      <AccountHeading
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{order.number}</span>
            {order.priority === "urgente" && <Zap className="size-6 text-warning" aria-label="Urgente" />}
            {order.late && <AlertTriangle className="size-6 text-danger" aria-label="Atrasado" />}
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/pedidos/${order.number}/ordem-producao`} target="_blank">
                <Printer aria-hidden /> Ordem de produção
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/pdf/proforma/${encodeURIComponent(order.number)}`}>
                <FileText aria-hidden /> Pro-forma
              </a>
            </Button>
          </div>
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
          {order.awaitingDeposit && <Badge tone="warning">Provas aprovadas · a aguardar sinal</Badge>}
          <span className="text-sm text-ink-3">
            Feito a {formatDateTime(order.createdAt)} · prazo {formatDate(order.dueAt)} · {order.revisionCount}{" "}
            revisão(ões)
          </span>
        </span>
      </AccountHeading>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <section aria-labelledby="itens" className="space-y-3">
            <h2 id="itens" className="text-lg font-semibold">
              Produtos
            </h2>
            <ul className="divide-y divide-line rounded-sm border border-line bg-card">
              {order.items.map((item) => (
                <li key={item.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-medium">
                      {item.name} × {item.quantity}
                      {item.urgent && <span className="ml-2 text-xs text-warning">urgente</span>}
                    </p>
                    <p className="font-mono text-sm">{formatKz(item.lineTotal)}</p>
                  </div>
                  <p className="text-sm text-ink-2">
                    {[
                      item.size && `${item.size.widthCm} × ${item.size.heightCm} cm`,
                      ...item.options.map((o) => `${o.label}: ${o.choiceLabel}`),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.notes && <p className="text-sm text-ink-2">Nota do cliente: {item.notes}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <Badge tone={PROOF[item.proofStatus]?.tone ?? "neutral"}>
                      {PROOF[item.proofStatus]?.label ?? item.proofStatus}
                    </Badge>
                    <span className="text-ink-3">
                      {item.design === "endju_cria"
                        ? "Design pela Endju"
                        : item.artworkCheck
                          ? `Ficheiro do cliente: ${item.artworkCheck.name}${item.artworkCheck.dpi ? ` · ${item.artworkCheck.dpi} dpi` : ""}`
                          : "Ficheiro por receber (WhatsApp)"}
                    </span>
                    {item.currentProofId && (
                      <Link
                        href={`/admin/provas/${item.currentProofId}`}
                        className="font-medium text-brand hover:underline"
                      >
                        Ver prova
                      </Link>
                    )}
                    {canProof && (
                      <Link
                        href={`/admin/provas/nova?pedido=${order.number}&item=${item.id}`}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {item.currentProofId ? "Enviar nova versão" : "Enviar prova"}
                      </Link>
                    )}
                  </div>
                  {item.artworkCheck && item.artworkCheck.messages.length > 0 && (
                    <ul className="text-xs text-ink-3">
                      {item.artworkCheck.messages.map((m) => (
                        <li key={m}>· {m}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {tasks.length > 0 && (
            <section aria-labelledby="producao" className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="producao" className="text-lg font-semibold">
                  Produção
                </h2>
                {can(user, "production", "view") && (
                  <Link href="/admin/producao" className="text-sm font-medium text-brand hover:underline">
                    Abrir a oficina →
                  </Link>
                )}
              </div>
              <ul className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
                {tasks.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span>
                      {SECTOR_LABELS[task.sector]} · {task.itemName}
                      {task.waitingFor && task.status === "por_fazer" && (
                        <span className="ml-2 text-xs text-ink-3">
                          à espera da {SECTOR_LABELS[task.waitingFor].toLowerCase()}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {task.assigneeId && (
                        <span className="text-xs text-ink-3">
                          {staff.find((s) => s.uid === task.assigneeId)?.name ?? "Equipa"}
                        </span>
                      )}
                      <Badge tone={TASK_STATUS_META[task.status].tone}>{TASK_STATUS_META[task.status].label}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="historico" className="space-y-3">
            <h2 id="historico" className="text-lg font-semibold">
              Histórico
            </h2>
            <ol className="space-y-3 border-l border-line pl-5">
              {order.events.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    aria-hidden
                    className={`absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-paper ${event.visibility === "interno" ? "bg-ink-3" : "bg-ink"}`}
                  />
                  <p className="text-sm">
                    <span className="font-medium">{event.message}</span>
                    {event.visibility === "interno" && <span className="ml-2 text-xs text-ink-3">interno</span>}
                  </p>
                  <p className="text-xs text-ink-3">
                    {event.actorName} · {formatDateTime(event.at)}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {order.payments.length > 0 && (
            <section aria-labelledby="pagamentos" className="space-y-3">
              <h2 id="pagamentos" className="text-lg font-semibold">
                Pagamentos
              </h2>
              <ul className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-3 p-3">
                    <span>
                      {METHOD[p.method] ?? p.method} · {p.kind}
                      {p.reference && <span className="text-ink-3"> · {p.reference}</span>}
                    </span>
                    <span>
                      <span className="font-medium">{formatKz(p.amount)}</span>
                      <span className="ml-2 text-xs text-ink-3">{formatDateTime(p.confirmedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {/* key: quando o estado muda, a escolha volta ao primeiro passo seguinte do novo estado */}
          {canEdit && <StatusControl key={order.status} orderId={order.id} status={order.status} />}
          {canEdit && <AssignControl orderId={order.id} assigneeId={order.assigneeId} dueAt={dueIso} staff={staff} />}
          {canPay && (
            <PaymentControl
              orderId={order.id}
              due={order.totals.due}
              depositLeft={Math.max(order.depositRequired - order.totals.paid, 0)}
            />
          )}
          {canEdit && <NoteControl orderId={order.id} />}
          {canEdit && (
            <section className="space-y-2 rounded-sm border border-line bg-card p-4">
              <h2 className="text-sm font-semibold">Mensagem ao cliente</h2>
              <WhatsAppSend
                orderId={order.id}
                suggested={
                  order.status === "pronto"
                    ? "pedido.pronto"
                    : order.status === "em_aprovacao"
                      ? order.totals.paid < order.depositRequired
                        ? "sinal.pendente"
                        : "prova.enviada"
                      : order.status === "em_producao"
                        ? "pagamento.recebido"
                        : "pedido.confirmado"
                }
              />
            </section>
          )}

          <section className="space-y-2 rounded-sm border border-line bg-card p-4 text-sm">
            <h2 className="font-semibold">Cliente</h2>
            <p>
              <Link href={`/admin/clientes/${order.customerId}`} className="font-medium hover:underline">
                {order.customer.name}
              </Link>
              <span className="block text-ink-3">
                {formatPhone(order.customer.phone)}
                {order.customer.email && ` · ${order.customer.email}`}
                {order.customer.nif && ` · NIF ${order.customer.nif}`}
              </span>
            </p>
            {order.customerNotes && <p className="text-ink-2">Notas: {order.customerNotes}</p>}
            <p className="border-t border-line pt-2 text-ink-2">
              {order.delivery.method === "entrega" && order.delivery.address
                ? `Entrega a ${order.delivery.address.recipient} (${formatPhone(order.delivery.address.phone)}): ${order.delivery.address.street}, ${order.delivery.address.neighborhood}, ${order.delivery.address.municipality}, ${order.delivery.address.province}${order.delivery.address.reference ? ` · ${order.delivery.address.reference}` : ""}`
                : "Levantamento na loja"}
            </p>
          </section>

          <section className="space-y-1.5 rounded-sm border border-line bg-card p-4 text-sm text-ink-2">
            <h2 className="mb-2 font-semibold text-ink">Valores</h2>
            {[
              ["Produtos", formatKz(order.totals.items)],
              ...(order.totals.discount
                ? [[`Desconto${order.coupon ? ` (${order.coupon.code})` : ""}`, `−${formatKz(order.totals.discount)}`]]
                : []),
              ["Entrega", formatKz(order.totals.delivery)],
              ["IVA 14 % incluído", formatKz(order.totals.tax)],
              ["Total", formatKz(order.totals.total)],
              ["Sinal exigido", formatKz(order.depositRequired)],
              ["Pago", formatKz(order.totals.paid)],
              ["Em falta", formatKz(order.totals.due)],
            ].map(([label, value]) => (
              <p
                key={label}
                className={`flex justify-between ${label === "Total" || label === "Em falta" ? "font-semibold text-ink" : ""}`}
              >
                <span>{label}</span>
                <span className="font-mono text-xs">{value}</span>
              </p>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
