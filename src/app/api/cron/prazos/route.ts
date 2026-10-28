import { Timestamp } from "firebase-admin/firestore";
import { AUDIENCE, notifyRoles } from "@/features/admin/notify";
import { formatDateTime } from "@/lib/dates";
import { adminDb } from "@/lib/firebase/admin";

const DONE = ["pronto", "entregue", "cancelado"];

/**
 * Corre todos os dias às 07h de Luanda (vercel.json). Avisa a equipa dos pedidos que vencem nas próximas
 * 24 h ou que já passaram do prazo (um aviso de cada, por pedido) e dá por expiradas as referências vencidas.
 * A Vercel chama-o com "Authorization: Bearer CRON_SECRET".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Sem autorização.", { status: 401 });
  const db = adminDb();
  const now = Date.now();
  const soon = Timestamp.fromMillis(now + 24 * 3_600_000);
  const [orders, payments] = await Promise.all([
    db.collection("orders").where("dueAt", "<=", soon).get(),
    db.collection("payments").where("provider.expiresAt", "<", Timestamp.fromMillis(now)).get(),
  ]);
  let warned = 0;
  for (const order of orders.docs) {
    if (DONE.includes(order.get("status"))) continue;
    const late = (order.get("dueAt") as Timestamp).toMillis() < now;
    const flag = late ? "lateReminderAt" : "dueReminderAt";
    if (order.get(flag)) continue;
    await notifyRoles([...AUDIENCE.sales, "operador"], {
      event: "prazo.a_expirar",
      title: `${late ? "Atrasado" : "Prazo a expirar"} · ${order.get("number")}`,
      body: `${order.get("customer.name") ?? "Cliente"} · prazo ${formatDateTime((order.get("dueAt") as Timestamp).toDate())}`,
      link: `/admin/pedidos/${order.get("number")}`,
    });
    await order.ref.update({ [flag]: Timestamp.now() });
    warned++;
  }
  let expired = 0;
  for (const payment of payments.docs) {
    if (payment.get("status") !== "pendente") continue;
    await payment.ref.update({ status: "expirado" });
    expired++;
  }
  return Response.json({ ok: true, warned, expired });
}
