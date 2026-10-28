import type { Cents } from "@/lib/domain/money";

const DAY = 86_400_000;
const LUANDA = 3_600_000; // UTC+1 todo o ano, sem hora de verão

/** Início de hoje, da semana (segunda) e do mês, à meia-noite de Luanda. */
export function periodStarts(now: Date) {
  const day = Math.floor((now.getTime() + LUANDA) / DAY) * DAY;
  const local = new Date(day);
  const weekday = (local.getUTCDay() + 6) % 7; // 0 = segunda
  return {
    today: new Date(day - LUANDA),
    week: new Date(day - weekday * DAY - LUANDA),
    month: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - LUANDA),
  };
}

/** Receita confirmada de hoje, da semana e do mês, e por semana nas últimas `weeks` semanas (a última é a atual). */
export function revenueSummary(payments: { amount: Cents; at: Date }[], now: Date, weeks = 8) {
  const starts = periodStarts(now);
  const sum = (from: Date, to = new Date(8.64e15)) =>
    payments.filter((p) => p.at >= from && p.at < to).reduce((total, p) => total + p.amount, 0);
  return {
    today: sum(starts.today),
    week: sum(starts.week),
    month: sum(starts.month),
    weeks: Array.from({ length: weeks }, (_, i) => {
      const from = new Date(starts.week.getTime() - (weeks - 1 - i) * 7 * DAY);
      return { from, total: sum(from, new Date(from.getTime() + 7 * DAY)) };
    }),
  };
}

/** Os nomes que mais aparecem (produtos dos pedidos), do mais vendido para o menos. */
export function topNames(lists: string[][], limit = 5) {
  const counts = new Map<string, number>();
  for (const name of lists.flat()) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt"))
    .slice(0, limit);
}
