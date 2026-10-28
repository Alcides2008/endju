/** Rejeita POSTs vindos de outro domínio (o browser envia sempre Origin em fetch POST). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false; // ex.: "null" de iframes isolados
  }
}
