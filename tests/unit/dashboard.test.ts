import { describe, expect, it } from "vitest";
import { periodStarts, revenueSummary, topNames } from "@/features/admin/dashboard-math";

// Quarta-feira, 28 de outubro de 2026, 11:00 em Luanda
const now = new Date("2026-10-28T10:00:00Z");

describe("periodStarts", () => {
  it("usa a meia-noite de Luanda (UTC+1) e a semana a começar à segunda", () => {
    const starts = periodStarts(now);
    expect(starts.today.toISOString()).toBe("2026-10-27T23:00:00.000Z");
    expect(starts.week.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(starts.month.toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });
});

describe("revenueSummary", () => {
  it("soma por período e põe cada pagamento na sua semana", () => {
    const payments = [
      { amount: 100, at: new Date("2026-10-28T08:00:00Z") }, // hoje
      { amount: 200, at: new Date("2026-10-25T23:30:00Z") }, // segunda 00:30 em Luanda: esta semana
      { amount: 400, at: new Date("2026-10-25T22:30:00Z") }, // domingo 23:30: semana passada
      { amount: 800, at: new Date("2026-09-30T22:00:00Z") }, // 30 de setembro: mês passado
    ];
    const summary = revenueSummary(payments, now, 8);
    expect(summary.today).toBe(100);
    expect(summary.week).toBe(300);
    expect(summary.month).toBe(700);
    expect(summary.weeks).toHaveLength(8);
    expect(summary.weeks[7].total).toBe(300);
    expect(summary.weeks[6].total).toBe(400);
    expect(summary.weeks.reduce((s, w) => s + w.total, 0)).toBe(1500);
  });
});

describe("topNames", () => {
  it("conta e ordena os mais pedidos", () => {
    expect(topNames([["Lona", "Cartões"], ["Cartões"], ["Roll-up", "Cartões", "Lona"]], 2)).toEqual([
      { name: "Cartões", count: 3 },
      { name: "Lona", count: 2 },
    ]);
  });
});
