import "server-only";
import type { Transaction } from "firebase-admin/firestore";
import { adminDb } from "./admin";

/**
 * Próximo número sequencial do ano (docs/02 · counters), dentro da transação do documento que o usa:
 * dois pedidos ao mesmo tempo nunca recebem o mesmo número. "EDJ" + 2026 + 412 → "EDJ-2026-00412".
 */
export async function nextNumber(
  tx: Transaction,
  counter: "orders" | "quotes" | "purchaseOrders",
  prefix: string,
  now = new Date(),
) {
  const ref = adminDb().collection("counters").doc(counter);
  const snap = await tx.get(ref);
  const year = now.getFullYear();
  const data = snap.data() as { year: number; value: number } | undefined;
  const value = data?.year === year ? data.value + 1 : 1;
  tx.set(ref, { year, value });
  return `${prefix}-${year}-${String(value).padStart(5, "0")}`;
}
