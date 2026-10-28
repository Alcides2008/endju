import { describe, expect, it } from "vitest";
import { formatKz, formatKzWhole } from "@/lib/domain/money";

describe("formatKz", () => {
  it("formata cêntimos em Kz com separadores de pt-AO", () => {
    // O Intl usa espaço estreito sem quebra como separador de milhares
    expect(formatKz(18696000).replace(/\s/g, " ")).toBe("186 960,00 Kz");
    expect(formatKz(114000000).replace(/\s/g, " ")).toBe("1 140 000,00 Kz");
  });

  it("formatKzWhole arredonda ao Kz sem casas decimais", () => {
    expect(formatKzWhole(850000).replace(/\s/g, " ")).toBe("8 500 Kz");
    expect(formatKzWhole(25050).replace(/\s/g, " ")).toBe("251 Kz");
  });
});
