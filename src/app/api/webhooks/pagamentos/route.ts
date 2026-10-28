import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { confirmPayment } from "@/features/payments/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyWebhook } from "@/lib/payments/provider";

const eventSchema = z.object({
  paymentId: z.string().max(60).optional(),
  transactionId: z.string().max(80).optional(),
  reference: z.string().max(40).optional(),
  status: z.enum(["paid", "failed", "expired"]),
});

/** Payload de exemplo (fornecedor de teste): POST com x-endju-signature = HMAC-SHA256(corpo, PAYMENT_WEBHOOK_SECRET). */
async function findPayment(event: z.infer<typeof eventSchema>) {
  const payments = adminDb().collection("payments");
  if (event.paymentId) {
    const snap = await payments.doc(event.paymentId).get();
    return snap.exists ? snap : null;
  }
  const field = event.transactionId ? "provider.transactionId" : "provider.reference";
  const value = event.transactionId ?? event.reference;
  if (!value) return null;
  return (await payments.where(field, "==", value).limit(1).get()).docs[0] ?? null;
}

/**
 * Confirmação automática do Multicaixa Express e das referências (docs/04 · Pagamento). Só aceita pedidos
 * assinados; responde 200 a repetições para o fornecedor não insistir.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyWebhook(body, request.headers.get("x-endju-signature")))
    return new Response("Assinatura inválida.", { status: 401 });
  const parsed = eventSchema.safeParse(JSON.parse(body || "{}"));
  if (!parsed.success) return new Response("Evento inválido.", { status: 400 });
  const payment = await findPayment(parsed.data);
  if (!payment) return new Response("Pagamento desconhecido.", { status: 404 });
  try {
    if (parsed.data.status === "paid") {
      await confirmPayment(payment.id, { name: "Multicaixa", via: "webhook" });
    } else if (payment.get("status") === "pendente") {
      await payment.ref.update({
        status: parsed.data.status === "failed" ? "falhado" : "expirado",
        updatedAt: Timestamp.now(),
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[webhook pagamentos]", error);
    return new Response(error instanceof Error ? error.message : "Erro.", { status: 409 });
  }
}
