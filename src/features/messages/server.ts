import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { notifyUser } from "@/features/admin/notify";
import { DEFAULT_TEMPLATES, fillTemplate, TEMPLATE_KEYS, type Template, type TemplateKey } from "@/lib/domain/messages";
import { formatKz } from "@/lib/domain/money";
import { escapeHtml, sendEmail } from "@/lib/email";
import { adminDb } from "@/lib/firebase/admin";

/** Modelos guardados no painel, com os textos por omissão para os que ninguém editou. */
export async function getTemplates(): Promise<Template[]> {
  const snap = await adminDb().collection("messageTemplates").get();
  const saved = new Map(snap.docs.map((d) => [d.id, d.data()]));
  return TEMPLATE_KEYS.map((key) => {
    const doc = saved.get(key);
    return {
      key,
      whatsapp: doc?.whatsapp ?? DEFAULT_TEMPLATES[key].whatsapp,
      emailSubject: doc?.emailSubject ?? DEFAULT_TEMPLATES[key].emailSubject,
      email: doc?.email ?? DEFAULT_TEMPLATES[key].email,
      active: doc?.active ?? true,
    };
  });
}

export async function getTemplate(key: TemplateKey) {
  return (await getTemplates()).find((t) => t.key === key)!;
}

/** Histórico de envios (docs/02 · deliveries): email enviado/falhado, WhatsApp aberto pela equipa. */
export async function logDelivery(entry: {
  channel: "email" | "whatsapp";
  templateId: TemplateKey;
  to: string;
  status: "enviado" | "falhado" | "aberto";
  orderId?: string;
  orderNumber?: string;
  error?: string;
  by?: string;
  byName?: string;
}) {
  try {
    await adminDb()
      .collection("deliveries")
      .add({ ...entry, at: Timestamp.now() });
  } catch (error) {
    console.error("[mensagens] histórico por gravar", error);
  }
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Email ao cliente com o modelo do evento (Comunicação → Modelos), quando o email está configurado, o modelo
 * ativo e o cliente não o desligou nas preferências. Fica sempre no histórico (enviado ou não saiu).
 * shortcut: o WhatsApp automático espera pela API da Meta; até lá a equipa envia pelo pedido.
 */
export async function emailCustomer(orderId: string, key: TemplateKey) {
  try {
    const db = adminDb();
    const order = await db.collection("orders").doc(orderId).get();
    const to = order.get("customer.email") as string | undefined;
    if (!order.exists || !to) return;
    const userId = order.get("userId") as string | undefined;
    const prefs = userId ? (await db.collection("users").doc(userId).get()).get("notificationPrefs") : null;
    if (prefs?.email === false) return;
    const template = await getTemplate(key);
    if (!template.active) return;
    const totals = order.get("totals") ?? {};
    const number = order.get("number") as string;
    const vars = {
      "cliente.nome": String(order.get("customer.name") ?? "").split(" ")[0],
      "pedido.numero": number,
      "pedido.total": formatKz(totals.total ?? 0),
      "pedido.sinal": formatKz(order.get("depositRequired") ?? 0),
      "pedido.emFalta": formatKz(totals.due ?? 0),
      "link.pedido": `${SITE}/conta/pedidos/${number}`,
      "empresa.nome": "ENDJU BUSINESS",
    };
    const body = fillTemplate(template.email, vars);
    const result = await sendEmail({
      to,
      subject: fillTemplate(template.emailSubject, vars),
      text: `${body}\n\n${vars["link.pedido"]}`,
      html: `<div style="font-family:Arial,sans-serif;color:#121116;max-width:560px"><p>${escapeHtml(body)}</p><p><a href="${vars["link.pedido"]}">Ver o pedido</a></p></div>`,
    });
    await logDelivery({
      channel: "email",
      templateId: key,
      to,
      status: result.sent ? "enviado" : "falhado",
      orderId,
      orderNumber: number,
      error: result.sent ? undefined : result.reason,
    });
  } catch (error) {
    console.error("[mensagens] email por enviar", key, error);
  }
}

/** Aviso ao cliente no painel e por email (pagamentos confirmados pelo sistema). */
export async function notifyCustomer(orderId: string, key: TemplateKey, message: { title: string; body: string }) {
  const order = await adminDb().collection("orders").doc(orderId).get();
  const userId = order.get("userId") as string | undefined;
  if (userId) {
    await notifyUser(userId, {
      event: key === "pagamento.recebido" ? "pagamento.confirmado" : "pedido.estado",
      ...message,
      link: `/conta/pedidos/${order.get("number")}`,
    });
  }
  await emailCustomer(orderId, key);
}
