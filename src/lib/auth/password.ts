import "server-only";

const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : "https://identitytoolkit.googleapis.com";

export type PasswordCheck = { uid: string } | { error: "credenciais" | "bloqueado" | "desativado" };

/**
 * Confirma email + senha no Firebase Auth a partir do servidor (API REST do Identity Toolkit).
 * Usado no login por telemóvel, para o email associado nunca chegar ao browser.
 */
export async function verifyPassword(email: string, password: string): Promise<PasswordCheck> {
  const response = await fetch(
    `${base}/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      // Referer para continuar a funcionar se a API key for restringida ao domínio do site
      headers: { "content-type": "application/json", referer: process.env.NEXT_PUBLIC_SITE_URL ?? "" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = (await response.json().catch(() => ({}))) as { localId?: string; error?: { message?: string } };
  if (response.ok && data.localId) return { uid: data.localId };

  const code = data.error?.message ?? "";
  if (code.startsWith("TOO_MANY_ATTEMPTS")) return { error: "bloqueado" };
  if (code === "USER_DISABLED") return { error: "desativado" };
  return { error: "credenciais" };
}
