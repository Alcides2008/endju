"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { COMPANY } from "@/content/company";
import { getTemplate, logDelivery } from "@/features/messages/server";
import { formatDate } from "@/lib/dates";
import { fillTemplate, TEMPLATE_KEYS, whatsappTo, type TemplateKey } from "@/lib/domain/messages";
import { formatKz } from "@/lib/domain/money";
import { adminDb } from "@/lib/firebase/admin";
import { NO_PERMISSION, staffCan } from "./guard";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const templateSchema = z.object({
  whatsapp: z.string().trim().min(10, "Escreve a mensagem de WhatsApp.").max(1000),
  emailSubject: z.string().trim().min(3, "Escreve o assunto do email.").max(140),
  email: z.string().trim().min(10, "Escreve o texto do email.").max(2000),
  active: z.boolean(),
});

export async function saveTemplate(key: TemplateKey, input: z.input<typeof templateSchema>) {
  const user = await staffCan("messaging", "edit");
  if (!user) return NO_PERMISSION;
  if (!TEMPLATE_KEYS.includes(key)) return { ok: false as const, message: "Modelo desconhecido." };
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0].message };
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    tx.set(db.collection("messageTemplates").doc(key), {
      ...parsed.data,
      updatedAt: Timestamp.now(),
      updatedBy: user.uid,
    });
    tx.set(db.collection("auditLogs").doc(), {
      actorId: user.uid,
      actorName: user.name ?? user.email ?? "Equipa",
      actorRole: user.role,
      action: "template.updated",
      entity: { type: "messageTemplates", id: key, label: key },
      at: Timestamp.now(),
    });
  });
  revalidatePath("/admin/comunicacao", "layout");
  return { ok: true as const };
}

/** Mensagem do modelo preenchida com os dados do pedido, pronta a abrir no WhatsApp da equipa. */
export async function whatsappForOrder(orderId: string, key: TemplateKey) {
  const user = await staffCan("orders", "view");
  if (!user) return NO_PERMISSION;
  const order = await adminDb().collection("orders").doc(orderId).get();
  if (!order.exists) return { ok: false as const, message: "Pedido não encontrado." };
  const phone = (order.get("customer.phone") as string | undefined) ?? "";
  if (phone.replace(/\D/g, "").length < 9)
    return { ok: false as const, message: "O pedido não tem telefone do cliente." };
  const template = await getTemplate(key);
  if (!template.active) return { ok: false as const, message: "Este modelo está desligado em Comunicação." };
  const totals = order.get("totals") ?? {};
  const number = order.get("number") as string;
  const text = fillTemplate(template.whatsapp, {
    "cliente.nome": String(order.get("customer.name") ?? "").split(" ")[0],
    "pedido.numero": number,
    "pedido.total": formatKz(totals.total ?? 0),
    "pedido.sinal": formatKz(order.get("depositRequired") ?? totals.depositRequired ?? 0),
    "pedido.emFalta": formatKz(totals.due ?? 0),
    "pedido.prazo": formatDate(order.get("dueAt")?.toDate()),
    "link.pedido": `${SITE}/conta/pedidos/${number}`,
    "empresa.nome": COMPANY.name,
  });
  await logDelivery({
    channel: "whatsapp",
    templateId: key,
    to: phone,
    status: "aberto",
    orderId,
    orderNumber: number,
    by: user.uid,
    byName: user.name ?? user.email ?? "Equipa",
  });
  revalidatePath("/admin/comunicacao/historico");
  return { ok: true as const, url: whatsappTo(phone, text), text };
}
