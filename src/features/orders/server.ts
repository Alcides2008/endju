import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { COMPANY } from "@/content/company";
import { priceLine } from "@/features/cart/lines";
import { getProducts } from "@/features/catalog/server";
import { getCommerce, zoneFor } from "@/features/settings/server";
import { describeOptions } from "@/lib/domain/catalog";
import type { SessionUser } from "@/lib/auth/session";
import { formatKz } from "@/lib/domain/money";
import { addWorkingDays, couponDiscount, orderTotals, type Coupon } from "@/lib/domain/pricing";
import { searchTokens } from "@/lib/domain/search";
import { fillTemplate } from "@/lib/domain/messages";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getTemplate, logDelivery } from "@/features/messages/server";
import { adminDb } from "@/lib/firebase/admin";
import { nextNumber } from "@/lib/firebase/counters";
import { AUDIENCE, notifyRoles } from "@/features/admin/notify";
import type { CheckoutData, PreviewData } from "./schema";

const TAX_RATE = 14;

class CheckoutError extends Error {}

type CustomerDoc = { id: string; paymentTerms?: "pronto" | "sinal_50" | "a_30_dias" };

async function findCustomer(uid: string): Promise<CustomerDoc | null> {
  const snap = await adminDb().collection("customers").where("userIds", "array-contains", uid).limit(1).get();
  const doc = snap.docs[0];
  return doc ? { id: doc.id, paymentTerms: doc.get("paymentTerms") } : null;
}

function toCoupon(data: FirebaseFirestore.DocumentData): Coupon {
  return {
    type: data.type,
    value: data.value,
    minSubtotal: data.minSubtotal,
    maxDiscount: data.maxDiscount,
    startsAt: (data.startsAt as Timestamp | undefined)?.toDate() ?? new Date(0),
    endsAt: (data.endsAt as Timestamp | undefined)?.toDate(),
    usageLimit: data.usageLimit,
    usedCount: data.usedCount ?? 0,
    firstOrderOnly: Boolean(data.firstOrderOnly),
    active: Boolean(data.active),
  };
}

/**
 * Recalcula tudo no servidor a partir do catálogo (docs/04 · → recebido): preços, entrega, cupão, IVA e sinal.
 * O preço que o browser mostrou é ignorado.
 */
export async function computeCheckout(data: PreviewData, user: SessionUser, now = new Date()) {
  const catalog = await getProducts();
  const priced = data.items.map((item) => priceLine(item, catalog));
  const broken = priced.find((line) => !line.ok);
  if (broken && !broken.ok) return { ok: false as const, message: broken.error };
  const lines = priced.filter((line) => line.ok);

  const delivery = data.delivery;
  const commerce = await getCommerce();
  const zone = delivery.method === "entrega" ? zoneFor(commerce.zones, delivery.province) : null;
  if (delivery.method === "entrega" && !zone)
    return { ok: false as const, message: "Ainda não entregamos nesta zona." };
  if (delivery.method === "levantamento" && !commerce.pickupPoints.some((p) => p.id === delivery.pickupPointId)) {
    return { ok: false as const, message: "Escolhe onde levantar." };
  }
  const deliveryFee = zone?.fee ?? 0;
  const itemsTotal = lines.reduce((sum, line) => sum + line.price.lineTotal, 0);

  const customer = await findCustomer(user.uid);
  const isFirstOrder =
    !customer || (await adminDb().collection("orders").where("customerId", "==", customer.id).limit(1).get()).empty;

  let discount = 0;
  let couponMessage: string | null = null;
  if (data.couponCode) {
    const snap = await adminDb().collection("coupons").doc(data.couponCode).get();
    if (!snap.exists) couponMessage = "Cupão não encontrado.";
    else {
      const result = couponDiscount(toCoupon(snap.data()!), { itemsTotal, delivery: deliveryFee, now, isFirstOrder });
      if (result.ok) discount = result.discount;
      else couponMessage = result.reason;
    }
  }

  const totals = orderTotals({
    lines: lines.map((line) => line.price),
    discount,
    delivery: deliveryFee,
    taxRate: TAX_RATE,
    depositPct: customer?.paymentTerms === "a_30_dias" ? 0 : commerce.depositPct,
  });
  const leadDays =
    Math.max(
      ...lines.map((line) => (line.item.urgent ? line.product.leadTime.urgentDays : line.product.leadTime.normalDays)),
    ) + (zone?.extraDays ?? 0);

  return {
    ok: true as const,
    lines,
    zone,
    totals,
    coupon: discount > 0 ? { code: data.couponCode, discount } : null,
    couponMessage,
    customer,
    isFirstOrder,
    dueAt: addWorkingDays(now, leadDays),
  };
}

export type CheckoutPreview = Awaited<ReturnType<typeof computeCheckout>>;

/** Cria o pedido numa só transação: número, ficha de cliente, pedido, itens, evento, cupão e auditoria. */
export async function placeOrder(data: CheckoutData, user: SessionUser) {
  const now = new Date();
  const calc = await computeCheckout(
    {
      items: data.items,
      delivery:
        data.delivery.method === "entrega"
          ? { method: "entrega", province: data.delivery.address.province }
          : data.delivery,
      couponCode: data.couponCode,
    },
    user,
    now,
  );
  if (!calc.ok) return calc;
  if (data.couponCode && calc.couponMessage) return { ok: false as const, message: calc.couponMessage };

  const db = adminDb();
  const orderRef = db.collection("orders").doc();
  const customerRef = db.collection("customers").doc(calc.customer?.id ?? db.collection("customers").doc().id);
  const couponRef = calc.coupon ? db.collection("coupons").doc(calc.coupon.code) : null;
  const at = Timestamp.fromDate(now);
  const meta = { createdAt: at, updatedAt: at, createdBy: user.uid, updatedBy: user.uid };

  const address =
    data.delivery.method === "entrega"
      ? { id: "entrega", label: "Entrega", isDefault: true, ...data.delivery.address }
      : undefined;

  let number: string;
  try {
    number = await db.runTransaction(async (tx) => {
      // Leituras primeiro (regra das transações do Firestore), depois as escritas: nextNumber já escreve
      if (couponRef && calc.coupon) {
        const snap = await tx.get(couponRef);
        const recheck = snap.exists
          ? couponDiscount(toCoupon(snap.data()!), {
              itemsTotal: calc.totals.items,
              delivery: calc.totals.delivery,
              now,
              isFirstOrder: calc.isFirstOrder,
            })
          : { ok: false as const, reason: "Cupão não encontrado." };
        if (!recheck.ok || recheck.discount !== calc.coupon.discount) {
          throw new CheckoutError(recheck.ok ? "O desconto do cupão mudou. Revê o resumo." : recheck.reason);
        }
      }
      const orderNumber = await nextNumber(tx, "orders", "EDJ", now);

      if (!calc.customer) {
        tx.set(customerRef, {
          type: data.customer.type,
          segment: data.customer.type,
          name: data.customer.name,
          nif: data.customer.nif || undefined,
          email: user.email,
          phone: data.customer.phone,
          contacts: [],
          addresses: address ? [address] : [],
          tags: [],
          userIds: [user.uid],
          paymentTerms: "sinal_50",
          stats: { ordersCount: 0, totalSpent: 0, balanceDue: 0 },
          searchTokens: searchTokens(data.customer.name, data.customer.phone, data.customer.nif, user.email),
          ...meta,
        });
      }

      tx.set(orderRef, {
        number: orderNumber,
        customerId: customerRef.id,
        userId: user.uid,
        customer: {
          name: data.customer.name,
          nif: data.customer.nif || undefined,
          phone: data.customer.phone,
          email: user.email,
          type: data.customer.type,
        },
        channel: "site",
        status: "recebido",
        paymentStatus: "pendente",
        priority: calc.lines.some((line) => line.item.urgent) ? "urgente" : "normal",
        itemsSummary: { count: calc.lines.length, names: calc.lines.map((line) => line.name) },
        totals: { ...calc.totals, paid: 0, due: calc.totals.total },
        depositRequired: calc.totals.depositRequired,
        coupon: calc.coupon ?? undefined,
        delivery:
          data.delivery.method === "entrega"
            ? { method: "entrega", zoneId: calc.zone?.id, address, fee: calc.totals.delivery }
            : { method: "levantamento", pickupPointId: data.delivery.pickupPointId, fee: 0 },
        dueAt: Timestamp.fromDate(calc.dueAt),
        needsDesign: calc.lines.some((line) => line.item.design === "endju_cria"),
        revisionCount: 0,
        customerNotes: data.notes || undefined,
        searchTokens: searchTokens(orderNumber, data.customer.name, data.customer.phone, data.customer.nif),
        ...meta,
      });

      for (const line of calc.lines) {
        tx.set(orderRef.collection("items").doc(), {
          productId: line.product.slug,
          name: line.name,
          options: describeOptions(line.product, line.item.options),
          size: line.item.size,
          quantity: line.item.quantity,
          urgent: line.item.urgent,
          design: line.item.design,
          artworkFileIds: [],
          // shortcut: sem upload (Storage por ativar); guarda o resultado da verificação feita no browser
          artworkCheck: line.item.artwork ?? undefined,
          notes: line.item.notes || undefined,
          unitPrice: line.price.unitPrice,
          lineSubtotal: line.price.lineTotal - line.price.lineTax,
          taxRate: line.product.taxRate,
          lineTax: line.price.lineTax,
          lineTotal: line.price.lineTotal,
          priceBreakdown: line.price.breakdown,
          proofStatus: "pendente",
          createdAt: at,
        });
      }

      tx.set(orderRef.collection("events").doc(), {
        type: "status",
        visibility: "cliente",
        to: "recebido",
        message: "Pedido recebido",
        actorId: user.uid,
        actorName: data.customer.name,
        at,
      });

      if (couponRef && calc.coupon) {
        tx.set(couponRef.collection("redemptions").doc(orderRef.id), {
          customerId: customerRef.id,
          discount: calc.coupon.discount,
          at,
        });
        tx.update(couponRef, { usedCount: FieldValue.increment(1), updatedAt: at });
      }

      tx.set(db.collection("auditLogs").doc(), {
        actorId: user.uid,
        actorName: data.customer.name,
        actorRole: user.role,
        action: "order.created",
        entity: { type: "orders", id: orderRef.id, label: orderNumber },
        after: { total: calc.totals.total, items: calc.lines.length },
        at,
      });

      return orderNumber;
    });
  } catch (error) {
    if (error instanceof CheckoutError) return { ok: false as const, message: error.message };
    console.error("[checkout] falha ao criar o pedido", error);
    return { ok: false as const, message: "Não conseguimos registar o pedido. Tenta outra vez dentro de momentos." };
  }

  await notifyRoles(AUDIENCE.sales, {
    event: "pedido.novo",
    title: `Novo pedido ${number}`,
    body: `${data.customer.name} · ${formatKz(calc.totals.total)}`,
    link: `/admin/pedidos/${number}`,
  });

  if (user.email) {
    const template = await getTemplate("pedido.confirmado");
    if (template.active) {
      const email = orderConfirmationEmail(number, data.customer.name, calc, template);
      const result = await sendEmail({ to: user.email, ...email });
      await logDelivery({
        channel: "email",
        templateId: "pedido.confirmado",
        to: user.email,
        status: result.sent ? "enviado" : "falhado",
        orderNumber: number,
        error: result.sent ? undefined : result.reason,
      });
    }
  }

  return { ok: true as const, number };
}

function orderConfirmationEmail(
  number: string,
  name: string,
  calc: Extract<CheckoutPreview, { ok: true }>,
  template: { emailSubject: string; email: string },
) {
  const vars = { "cliente.nome": name.split(" ")[0], "pedido.numero": number, "empresa.nome": COMPANY.name };
  const rows = calc.lines
    .map(
      (line) =>
        `<tr><td style="padding:6px 0">${escapeHtml(line.name)} × ${line.item.quantity}</td><td align="right">${formatKz(line.price.lineTotal)}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#121116;max-width:560px">
<h1 style="font-size:22px">${escapeHtml(fillTemplate(template.emailSubject, vars))}</h1>
<p>${escapeHtml(fillTemplate(template.email, vars))}</p>
<table width="100%" style="border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding-top:12px;border-top:1px solid #ddd"><strong>Total (IVA incluído)</strong></td><td align="right" style="padding-top:12px;border-top:1px solid #ddd"><strong>${formatKz(calc.totals.total)}</strong></td></tr>
<tr><td>Sinal para começar a produção</td><td align="right">${formatKz(calc.totals.depositRequired)}</td></tr></table>
<p style="font-size:13px;color:#4a4751">O prazo conta a partir da aprovação da prova e do pagamento do sinal. ${COMPANY.name} · ${COMPANY.city}</p></div>`;
  const text = `Recebemos o teu pedido ${number}. Total: ${formatKz(calc.totals.total)}. Sinal: ${formatKz(calc.totals.depositRequired)}.`;
  return { subject: fillTemplate(template.emailSubject, vars), html, text };
}

/** Pedido do próprio utilizador pelo número (página de confirmação). */
export async function getOwnOrder(number: string, uid: string) {
  const snap = await adminDb().collection("orders").where("number", "==", number).limit(1).get();
  const doc = snap.docs[0];
  if (!doc || doc.get("userId") !== uid) return null;
  const items = await doc.ref.collection("items").orderBy("createdAt").get();
  const data = doc.data();
  return {
    number: data.number as string,
    customerName: data.customer.name as string,
    totals: data.totals as {
      items: number;
      discount: number;
      delivery: number;
      tax: number;
      subtotal: number;
      total: number;
    },
    depositRequired: data.depositRequired as number,
    delivery: data.delivery as {
      method: "levantamento" | "entrega";
      fee: number;
      address?: { street: string; neighborhood: string; municipality: string; province: string };
    },
    dueAt: (data.dueAt as Timestamp).toDate(),
    items: items.docs.map((item) => ({
      name: item.get("name") as string,
      quantity: item.get("quantity") as number,
      lineTotal: item.get("lineTotal") as number,
      design: item.get("design") as "cliente_envia" | "endju_cria",
      artworkName: (item.get("artworkCheck")?.name as string | undefined) ?? null,
    })),
  };
}
