import "server-only";

/**
 * Envio de email transacional pelo Resend (API HTTP, sem dependência).
 * Sem RESEND_API_KEY e EMAIL_FROM não envia: até haver domínio verificado, a confirmação fica no ecrã e na conta.
 */
export async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { sent: false as const, reason: "email por configurar" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, reply_to: process.env.EMAIL_REPLY_TO || undefined, ...message }),
    });
    if (!response.ok) return { sent: false as const, reason: `Resend ${response.status}` };
    return { sent: true as const };
  } catch (error) {
    return { sent: false as const, reason: String(error) };
  }
}

/** Escapa texto do utilizador antes de o pôr no HTML do email. */
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
