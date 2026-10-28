import "server-only";
import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";

/** Janela fixa: dentro da janela conta, fora dela recomeça. Função pura para os testes. */
export function nextWindow(
  state: { count: number; windowStart: number } | null,
  now: number,
  limit: number,
  windowMs: number,
) {
  const fresh = !state || now - state.windowStart >= windowMs;
  const count = fresh ? 1 : state.count + 1;
  return { count, windowStart: fresh ? now : state.windowStart, allowed: count <= limit };
}

/** IP de quem pede: na Vercel vem no primeiro valor de x-forwarded-for. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

/**
 * Limite de pedidos por IP nos formulários públicos (docs/02 · rateLimits, TTL em expiresAt). O IP fica só
 * como hash. Se o Firestore falhar, deixa passar: um limite partido não pode impedir clientes de encomendar.
 */
export async function rateLimit(action: string, { limit, windowMs }: { limit: number; windowMs: number }) {
  const key = createHash("sha256")
    .update(`${action}:${await clientIp()}`)
    .digest("hex")
    .slice(0, 40);
  const ref = adminDb().collection("rateLimits").doc(key);
  try {
    return await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const next = nextWindow(
        snap.exists ? { count: snap.get("count"), windowStart: snap.get("windowStart").toMillis() } : null,
        now,
        limit,
        windowMs,
      );
      tx.set(ref, {
        action,
        count: next.count,
        windowStart: Timestamp.fromMillis(next.windowStart),
        expiresAt: Timestamp.fromMillis(next.windowStart + windowMs),
      });
      return next.allowed;
    });
  } catch (error) {
    console.error("[rate-limit] falha, a deixar passar", error);
    return true;
  }
}

const HOUR = 3_600_000;
/** Limites por formulário: folgados para uma pessoa, apertados para um robô. */
export const LIMITS = {
  register: { limit: 5, windowMs: HOUR },
  phoneLogin: { limit: 10, windowMs: 15 * 60_000 },
  contact: { limit: 5, windowMs: HOUR },
  quote: { limit: 5, windowMs: HOUR },
  newsletter: { limit: 5, windowMs: HOUR },
} as const;

export const RATE_LIMITED = "Demasiados pedidos seguidos. Espera um pouco e tenta de novo.";
