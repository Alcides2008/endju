import { proformaPdf } from "@/features/account/proforma-pdf";
import { getOrderView } from "@/features/account/server";
import { getSession } from "@/lib/auth/session";
import { loadLogo } from "@/lib/document-pdf";
import { can, isStaff } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";

/** Pro-forma em PDF: o cliente descarrega as suas; a equipa com acesso a Pedidos descarrega qualquer uma. */
export async function GET(request: Request, { params }: RouteContext<"/api/pdf/proforma/[numero]">) {
  const user = await getSession();
  if (!user) return new Response("Sessão terminada.", { status: 401 });
  const { numero } = await params;
  const staff = isStaff(user.role) && can(user, "orders", "view");
  const order = await getOrderView(numero, staff ? undefined : user.uid);
  if (!order) return new Response("Pedido não encontrado.", { status: 404 });

  const snapshot = (await adminDb().collection("orders").doc(order.id).get()).get("customer") as {
    name: string;
    nif?: string;
    phone: string;
    email?: string;
  };
  const bytes = await proformaPdf(order, snapshot, await loadLogo(request.url));
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pro-forma-${order.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
