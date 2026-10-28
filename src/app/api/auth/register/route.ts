import { adminAuth } from "@/lib/firebase/admin";
import { isSameOrigin } from "@/lib/auth/origin";
import { registerSchema } from "@/features/auth/schema";
import { LIMITS, RATE_LIMITED, rateLimit } from "@/lib/rate-limit";

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

const CONFLICTS: Record<string, string> = {
  "auth/email-already-exists": "Já existe uma conta com este email. Entra ou recupera a senha.",
  "auth/phone-number-already-exists": "Este telemóvel já está associado a outra conta.",
  "auth/invalid-phone-number": "Número de telemóvel inválido.",
  "auth/invalid-email": "Esse email não parece válido.",
};

/**
 * Cria a conta no servidor para o email e o telemóvel ficarem únicos de uma só vez
 * (o Firebase recusa telemóveis repetidos). O browser entra a seguir com email e senha.
 * Limite por IP contra contas em massa.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return error(403, "Origem não autorizada.");

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");

  if (!(await rateLimit("register", LIMITS.register))) return error(429, RATE_LIMITED);

  const { name, email, phone, password } = parsed.data;
  try {
    await adminAuth().createUser({ email, password, displayName: name, phoneNumber: phone });
  } catch (err) {
    const message = CONFLICTS[(err as { code?: string }).code ?? ""];
    if (message) return error(409, message);
    throw err;
  }
  return Response.json({ ok: true }, { status: 201 });
}
