import { getCompany } from "@/features/settings/server";
import { getSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { commercialPdf, loadLogo } from "@/lib/document-pdf";
import { PAYMENT_METHOD_LABELS } from "@/lib/domain/finance";
import { formatKz } from "@/lib/domain/money";
import { can, isStaff } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";

const KIND: Record<string, string> = { sinal: "Sinal", restante: "Restante", total: "Pagamento total" };

/**
 * Recibo de um pagamento confirmado: o cliente descarrega os seus; a equipa com Financeiro ou Pedidos, qualquer um.
 * Recibo interno, sem valor fiscal (a fatura-recibo sai do programa certificado pela AGT).
 */
export async function GET(request: Request, { params }: RouteContext<"/api/pdf/recibo/[id]">) {
  const user = await getSession();
  if (!user) return new Response("Sessão terminada.", { status: 401 });
  const payment = await adminDb()
    .collection("payments")
    .doc((await params).id)
    .get();
  if (!payment.exists || payment.get("status") !== "confirmado")
    return new Response("Recibo não encontrado.", { status: 404 });
  const order = await adminDb().collection("orders").doc(payment.get("orderId")).get();
  const staff = isStaff(user.role) && (can(user, "finance", "view") || can(user, "orders", "view"));
  if (!order.exists || (!staff && order.get("userId") !== user.uid))
    return new Response("Recibo não encontrado.", { status: 404 });

  const amount = payment.get("amount") as number;
  const totals = order.get("totals") ?? {};
  const bytes = await commercialPdf(
    {
      title: "RECIBO",
      number: `${order.get("number")}-${payment.id.slice(0, 5).toUpperCase()}`,
      meta: [
        `Pago a ${formatDateTime(payment.get("confirmedAt").toDate())}`,
        `${PAYMENT_METHOD_LABELS[payment.get("method")] ?? payment.get("method")}${payment.get("provider.reference") ? ` · ${payment.get("provider.reference")}` : ""}`,
      ],
      customer: {
        name: order.get("customer.name"),
        nif: order.get("customer.nif") ?? undefined,
        phone: order.get("customer.phone") ?? undefined,
        email: order.get("customer.email") ?? undefined,
      },
      lines: [
        {
          name: `${KIND[payment.get("kind")] ?? "Pagamento"} do pedido ${order.get("number")}`,
          quantity: 1,
          lineTotal: amount,
        },
      ],
      totals: [
        ["Recebido", formatKz(amount), true],
        ["Total do pedido", formatKz(totals.total ?? 0)],
        ["Em falta", formatKz(totals.due ?? 0)],
      ],
      notes: ["Recibo interno, sem valor fiscal. A fatura-recibo é emitida no programa de faturação certificado."],
    },
    await loadLogo(request.url),
    await getCompany(),
  );
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${order.get("number")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
