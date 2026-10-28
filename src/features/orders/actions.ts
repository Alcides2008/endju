"use server";

import { isStaff } from "@/lib/domain/permissions";
import { getSession } from "@/lib/auth/session";
import { checkoutSchema, previewSchema, type CheckoutInput, type PreviewInput } from "./schema";
import { computeCheckout, placeOrder } from "./server";

export type CheckoutSummary =
  | {
      ok: true;
      lines: { id: string; name: string; details: string[]; quantity: number; lineTotal: number }[];
      totals: {
        items: number;
        discount: number;
        delivery: number;
        tax: number;
        subtotal: number;
        total: number;
        depositRequired: number;
      };
      zoneName: string | null;
      couponApplied: string | null;
      couponMessage: string | null;
      dueAt: string;
    }
  | { ok: false; message: string; fields?: Record<string, string> };

async function customerSession() {
  const user = await getSession();
  if (!user)
    return { ok: false as const, message: "A tua sessão terminou. Entra outra vez para concluir a encomenda." };
  if (isStaff(user.role)) return { ok: false as const, message: "Para encomendar, entra com uma conta de cliente." };
  return { ok: true as const, user };
}

function firstIssues(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join(".")] ??= issue.message;
  return fields;
}

/** Resumo calculado no servidor (entrega, cupão, IVA, sinal), para o cliente ver antes de confirmar. */
export async function previewCheckout(input: PreviewInput): Promise<CheckoutSummary> {
  const session = await customerSession();
  if (!session.ok) return session;
  const parsed = previewSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Revê os produtos do carrinho.", fields: firstIssues(parsed.error) };

  const calc = await computeCheckout(parsed.data, session.user);
  if (!calc.ok) return calc;
  return {
    ok: true,
    lines: calc.lines.map((line) => ({
      id: line.item.id,
      name: line.name,
      details: line.details,
      quantity: line.item.quantity,
      lineTotal: line.price.lineTotal,
    })),
    totals: calc.totals,
    zoneName: calc.zone?.name ?? null,
    couponApplied: calc.coupon?.code ?? null,
    couponMessage: calc.couponMessage,
    dueAt: calc.dueAt.toISOString(),
  };
}

export async function submitOrder(
  input: CheckoutInput,
): Promise<{ ok: true; number: string } | { ok: false; message: string; fields?: Record<string, string> }> {
  const session = await customerSession();
  if (!session.ok) return session;
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revê os campos assinalados.", fields: firstIssues(parsed.error) };
  return placeOrder(parsed.data, session.user);
}
