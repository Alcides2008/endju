"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { AUDIENCE, notifyRoles } from "@/features/admin/notify";
import { getSession } from "@/lib/auth/session";
import { signedUpload } from "@/lib/cloudinary";
import { formatKz } from "@/lib/domain/money";
import { isStaff } from "@/lib/domain/permissions";
import { toE164 } from "@/lib/domain/phone";
import { adminDb } from "@/lib/firebase/admin";
import {
  createExpressPayment,
  createReferencePayment,
  isTestMode,
  onlinePaymentsEnabled,
} from "@/lib/payments/provider";
import { confirmPayment } from "./server";

const startSchema = z.object({
  method: z.enum(["multicaixa_express", "referencia", "transferencia"]),
  phone: z.string().trim().max(20).optional(),
});

/** O pedido é deste cliente? Devolve o documento. */
async function ownOrder(number: string, uid: string) {
  const snap = await adminDb().collection("orders").where("number", "==", number).limit(1).get();
  const order = snap.docs[0];
  return order && order.get("userId") === uid ? order : null;
}

/**
 * O cliente escolhe como pagar o que falta: primeiro o sinal (até começar a produção), depois o restante.
 * Um pagamento à espera do mesmo meio reaproveita-se, para não criar referências repetidas.
 */
export async function startPayment(orderNumber: string, input: z.input<typeof startSchema>) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Entra na tua conta para pagar." };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Escolhe como queres pagar." };
  const order = await ownOrder(orderNumber, user.uid);
  if (!order) return { ok: false as const, message: "Pedido não encontrado." };
  if (order.get("status") === "cancelado") return { ok: false as const, message: "Este pedido está cancelado." };
  const paid = (order.get("totals.paid") as number) ?? 0;
  const due = (order.get("totals.due") as number) ?? 0;
  const deposit = (order.get("depositRequired") as number) ?? 0;
  if (due <= 0) return { ok: false as const, message: "Este pedido já está pago." };
  const kind = paid < deposit ? "sinal" : paid === 0 ? "total" : "restante";
  const amount = kind === "sinal" ? deposit - paid : due;
  const { method } = parsed.data;
  if (method !== "transferencia" && !onlinePaymentsEnabled())
    return { ok: false as const, message: "O pagamento online ainda não está disponível. Paga por transferência." };
  let phone = "";
  if (method === "multicaixa_express") {
    phone = toE164(parsed.data.phone ?? "") ?? "";
    if (!phone) return { ok: false as const, message: "Indica o número associado ao Multicaixa Express." };
  }

  const db = adminDb();
  const open = await db.collection("payments").where("orderId", "==", order.id).get();
  const reusable = open.docs.find(
    (p) =>
      p.get("status") === "pendente" &&
      p.get("method") === method &&
      p.get("amount") === amount &&
      (!p.get("provider.expiresAt") || p.get("provider.expiresAt").toMillis() > Date.now()),
  );
  if (reusable) return { ok: true as const, id: reusable.id };

  const number = order.get("number") as string;
  const provider =
    method === "multicaixa_express"
      ? createExpressPayment({ amount, phone, orderNumber: number })
      : method === "referencia"
        ? (({ expiresAt, ...rest }) => ({ ...rest, expiresAt: Timestamp.fromDate(expiresAt) }))(
            createReferencePayment({ amount, orderNumber: number }),
          )
        : { name: "transferencia" };
  const ref = await db.collection("payments").add({
    orderId: order.id,
    orderNumber: number,
    customerId: order.get("customerId") ?? null,
    userId: user.uid,
    kind,
    method,
    amount,
    status: "pendente",
    provider,
    createdAt: Timestamp.now(),
    createdBy: user.uid,
  });
  revalidatePath(`/conta/pedidos/${number}`);
  return { ok: true as const, id: ref.id };
}

/** Pagamento deste cliente (ou de qualquer um, para a equipa). */
async function ownPayment(paymentId: string) {
  const user = await getSession();
  if (!user) return null;
  const snap = await adminDb().collection("payments").doc(paymentId).get();
  if (!snap.exists || (snap.get("userId") !== user.uid && !isStaff(user.role))) return null;
  return { user, snap };
}

/** Assinatura para enviar o comprovativo de transferência para o Cloudinary, como ficheiro privado. */
export async function signTransferProof(paymentId: string) {
  const own = await ownPayment(paymentId);
  if (!own || own.snap.get("method") !== "transferencia") return null;
  return signedUpload(`endju/comprovativos/${own.snap.get("orderId")}`, { private: true, formats: "document" });
}

const proofSchema = z.object({
  publicId: z.string().max(200),
  format: z.enum(["jpg", "jpeg", "png", "webp", "pdf", "heic", "tif", "tiff"]),
  reference: z.string().trim().max(80),
});

/** Comprovativo enviado: o pagamento fica à espera da validação do Financeiro, que recebe aviso. */
export async function attachTransferProof(paymentId: string, input: z.input<typeof proofSchema>) {
  const own = await ownPayment(paymentId);
  if (!own) return { ok: false as const, message: "Pagamento não encontrado." };
  const parsed = proofSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Envia o comprovativo em PDF ou imagem." };
  if (!parsed.data.publicId.startsWith(`endju/comprovativos/${own.snap.get("orderId")}/`))
    return { ok: false as const, message: "Comprovativo inválido." };
  if (own.snap.get("status") !== "pendente") return { ok: false as const, message: "Este pagamento já foi tratado." };
  await own.snap.ref.update({
    status: "aguarda_validacao",
    transferProof: { publicId: parsed.data.publicId, format: parsed.data.format, uploadedAt: Timestamp.now() },
    "provider.reference": parsed.data.reference || null,
  });
  await notifyRoles(AUDIENCE.finance, {
    event: "pagamento.confirmado",
    title: `Comprovativo por validar · ${own.snap.get("orderNumber")}`,
    body: `Transferência de ${formatKz(own.snap.get("amount"))}`,
    link: "/admin/financeiro/pagamentos",
  });
  revalidatePath(`/conta/pedidos/${own.snap.get("orderNumber")}`);
  return { ok: true as const };
}

/** Só em modo de teste: faz de conta que o banco confirmou (o mesmo caminho do webhook). */
export async function simulatePayment(paymentId: string) {
  if (!isTestMode()) return { ok: false as const, message: "Só disponível em modo de teste." };
  const own = await ownPayment(paymentId);
  if (!own) return { ok: false as const, message: "Pagamento não encontrado." };
  if (own.snap.get("method") === "transferencia")
    return { ok: false as const, message: "As transferências confirmam-se no Financeiro, depois do comprovativo." };
  try {
    await confirmPayment(paymentId, { name: "Multicaixa (teste)", via: "webhook" });
    revalidatePath(`/conta/pedidos/${own.snap.get("orderNumber")}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Não foi possível confirmar." };
  }
}
