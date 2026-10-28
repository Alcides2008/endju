/**
 * Normaliza um telefone para E.164. Números angolanos de 9 dígitos (9XX XXX XXX) ganham +244.
 * Devolve null se não for um número válido.
 */
export function toE164(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, "");
  if (/^9\d{8}$/.test(digits)) return `+244${digits}`;
  if (/^(00|\+)?2449\d{8}$/.test(digits)) return `+${digits.replace(/^(00|\+)/, "")}`;
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits; // outros países
  return null;
}

/** +244923456789 → +244 923 456 789 */
export function formatPhone(e164: string): string {
  const match = /^\+244(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return match ? `+244 ${match[1]} ${match[2]} ${match[3]}` : e164;
}
