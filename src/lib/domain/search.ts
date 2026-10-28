/**
 * Tokens de prefixo para pesquisa no painel sem motor externo (decisão 8 do plano):
 * "Ana Kiala" → a, an, ana, k, ki, … kiala. Consulta com `array-contains` do termo escrito, em minúsculas.
 */
export function searchTokens(...values: (string | null | undefined)[]): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    const words = (value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split(/[^a-z0-9@.+]+/);
    for (const word of words) {
      for (let i = 1; i <= Math.min(word.length, 20); i++) tokens.add(word.slice(0, i));
    }
  }
  return [...tokens];
}

/** "Couché mate 350 g" → "couche-mate-350-g": chaves de escolhas e endereços de páginas. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
