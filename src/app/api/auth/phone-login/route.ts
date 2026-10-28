import { adminAuth } from "@/lib/firebase/admin";
import { isSameOrigin } from "@/lib/auth/origin";
import { verifyPassword } from "@/lib/auth/password";
import { phoneLoginSchema } from "@/features/auth/schema";
import { LIMITS, RATE_LIMITED, rateLimit } from "@/lib/rate-limit";

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/**
 * Login com telemóvel + senha, sem SMS: encontra a conta pelo telemóvel, confirma a senha no servidor
 * e devolve um custom token para o browser entrar no Firebase. Telemóvel inexistente e senha errada
 * dão a mesma resposta, para não revelar quem tem conta.
 * Além do bloqueio por conta do Firebase, há limite por IP (adivinhar senhas de várias contas).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return error(403, "Origem não autorizada.");

  const parsed = phoneLoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(400, "Pedido inválido.");
  if (!(await rateLimit("phone-login", LIMITS.phoneLogin))) return error(429, RATE_LIMITED);

  const email = await adminAuth()
    .getUserByPhoneNumber(parsed.data.phone)
    .then((user) => user.email)
    .catch(() => undefined);
  const check = email ? await verifyPassword(email, parsed.data.password) : ({ error: "credenciais" } as const);

  if ("error" in check) {
    if (check.error === "bloqueado") return error(429, "Demasiadas tentativas. Espera alguns minutos e tenta de novo.");
    if (check.error === "desativado") return error(403, "Esta conta está desativada. Fala com a Endju.");
    return error(401, "Telemóvel ou senha incorretos.");
  }
  return Response.json({ customToken: await adminAuth().createCustomToken(check.uid) });
}
