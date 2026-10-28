/**
 * Converte o progresso do scroll (0–1) no parâmetro do percurso da câmara, abrandando junto de cada paragem
 * para o texto de cada capítulo ter tempo de leitura (smoothstep dentro de cada segmento).
 */
export function dwell(progress: number, stops: number) {
  const segments = stops - 1;
  const s = Math.min(Math.max(progress, 0), 1) * segments;
  const i = Math.min(Math.floor(s), segments - 1);
  const f = s - i;
  return (i + f * f * (3 - 2 * f)) / segments;
}
