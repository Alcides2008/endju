import "server-only";
import { formatDate } from "@/lib/dates";
import { getCompany } from "@/features/settings/server";
import { commercialPdf } from "@/lib/document-pdf";
import { formatKz } from "@/lib/domain/money";
import type { getMyOrder } from "./server";

type Order = NonNullable<Awaited<ReturnType<typeof getMyOrder>>>;

/**
 * Pro-forma do pedido, gerada a pedido (não é guardada). Sem valor fiscal: as faturas saem do software
 * certificado pela AGT (decisão 7 do plano).
 */
export async function proformaPdf(
  order: Order,
  customer: { name: string; nif?: string; phone: string; email?: string },
  logoPng: Uint8Array | null,
) {
  return commercialPdf(
    {
      title: "PRO-FORMA",
      number: order.number,
      meta: [`Data: ${formatDate(order.createdAt)}`],
      customer,
      lines: order.items.map((item) => ({
        name: item.name,
        details: [
          item.size && `${item.size.widthCm} × ${item.size.heightCm} cm`,
          ...item.options.map((o) => o.choiceLabel),
        ]
          .filter(Boolean)
          .join(" · "),
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      totals: [
        ["Produtos", formatKz(order.totals.items)],
        ...(order.totals.discount > 0 ? [["Desconto", `-${formatKz(order.totals.discount)}`] as [string, string]] : []),
        [
          order.delivery.method === "entrega" ? "Entrega" : "Levantamento na loja",
          order.delivery.fee ? formatKz(order.delivery.fee) : "Grátis",
        ],
        ["Base tributável", formatKz(order.totals.subtotal)],
        ["IVA 14 %", formatKz(order.totals.tax)],
        ["Total", formatKz(order.totals.total), true],
        ["Sinal para iniciar a produção", formatKz(order.depositRequired)],
      ],
      notes: [
        "Documento sem valor fiscal. A fatura é emitida em software certificado pela AGT.",
        "O prazo de produção conta a partir da aprovação da prova e do pagamento do sinal.",
        "Pagamento por Multicaixa Express, referência ou transferência bancária.",
      ],
    },
    logoPng,
    await getCompany(),
  );
}
