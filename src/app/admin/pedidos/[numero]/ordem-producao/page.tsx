import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/features/admin/components/print-button";
import { requireModule } from "@/features/admin/guard";
import { getAdminOrder, listStaff } from "@/features/admin/orders";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/domain/phone";

export async function generateMetadata({
  params,
}: PageProps<"/admin/pedidos/[numero]/ordem-producao">): Promise<Metadata> {
  return { title: `Ordem de produção ${(await params).numero}` };
}

const STEPS = [
  "Design / pré-impressão",
  "Impressão",
  "Corte",
  "Acabamento",
  "Controlo de qualidade",
  "Embalagem e expedição",
];

/** Folha A4 que acompanha o trabalho na oficina (sem preços: só o que a produção precisa). */
export default async function ProductionOrderPage({ params }: PageProps<"/admin/pedidos/[numero]/ordem-producao">) {
  await requireModule("orders", "view", "/admin/pedidos");
  const [order, staff] = await Promise.all([getAdminOrder((await params).numero), listStaff()]);
  if (!order) notFound();
  const assignee = staff.find((s) => s.uid === order.assigneeId)?.name;

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-card p-8 text-ink print:max-w-none print:bg-white print:p-0">
      <div className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
        <div>
          <p className="eyebrow text-ink-3">Ordem de produção</p>
          <p className="font-mono text-3xl font-bold">{order.number}</p>
          {order.priority === "urgente" && <p className="mt-1 text-lg font-bold text-brand">URGENTE</p>}
        </div>
        <div className="text-right text-sm">
          <p>
            Prazo: <strong>{formatDate(order.dueAt)}</strong>
          </p>
          <p>Entrada: {formatDateTime(order.createdAt)}</p>
          <p>Responsável: {assignee ?? "—"}</p>
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="eyebrow text-ink-3">Cliente</p>
          <p className="font-medium">{order.customer.name}</p>
          <p>{formatPhone(order.customer.phone)}</p>
        </div>
        <div>
          <p className="eyebrow text-ink-3">Entrega</p>
          <p>
            {order.delivery.method === "entrega" && order.delivery.address
              ? `${order.delivery.address.street}, ${order.delivery.address.neighborhood}, ${order.delivery.address.municipality}, ${order.delivery.address.province}`
              : "Levantamento na loja"}
          </p>
        </div>
      </div>

      <ol className="space-y-4">
        {order.items.map((item, i) => (
          <li key={item.id} className="break-inside-avoid rounded-sm border border-ink/40 p-4">
            <p className="text-lg font-semibold">
              {i + 1}. {item.name} — {item.quantity} un.
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {item.size && (
                <li>
                  Medidas:{" "}
                  <strong>
                    {item.size.widthCm} × {item.size.heightCm} cm
                  </strong>
                </li>
              )}
              {item.options.map((o) => (
                <li key={o.label}>
                  {o.label}: <strong>{o.choiceLabel}</strong>
                </li>
              ))}
              <li>
                Arte:{" "}
                {item.design === "endju_cria"
                  ? "design pela Endju"
                  : (item.artworkCheck?.name ?? "ficheiro do cliente")}
              </li>
              <li>Prova: {item.proofStatus === "aprovada" ? "aprovada" : "por aprovar"}</li>
            </ul>
            {item.notes && <p className="mt-2 text-sm">Notas: {item.notes}</p>}
          </li>
        ))}
      </ol>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink">
            <th className="py-2 font-semibold">Etapa</th>
            <th className="py-2 font-semibold">Operador</th>
            <th className="py-2 font-semibold">Data e hora</th>
            <th className="py-2 font-semibold">Visto</th>
          </tr>
        </thead>
        <tbody>
          {STEPS.map((step) => (
            <tr key={step} className="border-b border-ink/30">
              <td className="py-3">{step}</td>
              <td className="py-3" />
              <td className="py-3" />
              <td className="py-3">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      {order.customerNotes && <p className="text-sm">Notas do cliente: {order.customerNotes}</p>}
    </div>
  );
}
