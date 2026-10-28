import { describe, expect, it } from "vitest";
import { bannerLive, readingMinutes } from "@/lib/domain/content";

describe("bannerLive", () => {
  // 23:30 em Luanda (UTC+1) já é dia 1 de dezembro, embora em UTC ainda seja 30 de novembro
  const now = new Date("2026-11-30T23:30:00Z");

  it("conta o dia em Luanda, com início e fim incluídos", () => {
    expect(bannerLive({ active: true, startsAt: "2026-12-01", endsAt: "2026-12-24" }, now)).toBe(true);
    expect(bannerLive({ active: true, startsAt: "", endsAt: "2026-11-30" }, now)).toBe(false);
  });

  it("sem datas fica no ar até ser desligado", () => {
    expect(bannerLive({ active: true, startsAt: "", endsAt: "" }, now)).toBe(true);
    expect(bannerLive({ active: false, startsAt: "", endsAt: "" }, now)).toBe(false);
  });
});

describe("readingMinutes", () => {
  it("conta parágrafos e listas, com mínimo de 1 minuto", () => {
    expect(readingMinutes({ blocks: [{ type: "ul", items: ["a b", "c"] }] })).toBe(1);
    expect(readingMinutes({ blocks: [{ type: "p", text: Array(400).fill("palavra").join(" ") }] })).toBe(2);
  });
});
