import { describe, expect, it } from "vitest";
import { campaignResults, campaignStatus, normalizeCode, pathMatches, popupDue } from "@/lib/domain/marketing";

describe("normalizeCode", () => {
  it("põe o código em maiúsculas, sem espaços nem acentos", () => {
    expect(normalizeCode(" natal 26 ")).toBe("NATAL-26");
    expect(normalizeCode("verão!")).toBe("VERO");
  });
});

describe("campaignStatus", () => {
  it("segue as datas", () => {
    const c = { draft: false, startsAt: "2026-12-01", endsAt: "2026-12-24" };
    expect(campaignStatus(c, "2026-11-30")).toBe("agendada");
    expect(campaignStatus(c, "2026-12-24")).toBe("ativa");
    expect(campaignStatus(c, "2026-12-25")).toBe("terminada");
    expect(campaignStatus({ ...c, draft: true }, "2026-12-10")).toBe("rascunho");
  });
});

describe("campaignResults", () => {
  it("conta só os pedidos com os cupões da campanha, nas datas, sem cancelados", () => {
    const r = campaignResults({ couponCodes: ["NATAL"], startsAt: "2026-12-01", endsAt: "2026-12-24" }, [
      { code: "NATAL", day: "2026-12-02", total: 100_00, discount: 10_00, status: "recebido" },
      { code: "NATAL", day: "2026-12-03", total: 50_00, discount: 5_00, status: "cancelado" },
      { code: "NATAL", day: "2026-11-30", total: 70_00, discount: 7_00, status: "entregue" },
      { code: "OUTRO", day: "2026-12-05", total: 90_00, discount: 9_00, status: "recebido" },
    ]);
    expect(r).toEqual({ orders: 1, revenue: 100_00, discount: 10_00 });
  });
});

describe("pop-ups", () => {
  it("páginas: / é só a Home, as outras incluem as de baixo", () => {
    expect(pathMatches(["/"], "/")).toBe(true);
    expect(pathMatches(["/"], "/blog")).toBe(false);
    expect(pathMatches(["/orcamento"], "/orcamento/lona")).toBe(true);
    expect(pathMatches(["/orcamento"], "/orcamentos")).toBe(false);
    expect(pathMatches([], "/qualquer")).toBe(true);
  });

  it("volta a aparecer só depois dos dias escolhidos", () => {
    const day = 86_400_000;
    expect(popupDue(null, 7, 0)).toBe(true);
    expect(popupDue(0, 7, 6 * day)).toBe(false);
    expect(popupDue(0, 7, 7 * day)).toBe(true);
  });
});

describe("fillTemplate", () => {
  it("preenche as variáveis e deixa vazias as que não existem", async () => {
    const { fillTemplate, whatsappTo } = await import("@/lib/domain/messages");
    expect(
      fillTemplate("Olá {{cliente.nome}}, pedido {{ pedido.numero }} {{nada}}pronto.", {
        "cliente.nome": "Ana",
        "pedido.numero": "EDJ-1",
      }),
    ).toBe("Olá Ana, pedido EDJ-1 pronto.");
    expect(whatsappTo("+244 946 470 573", "Olá")).toBe("https://wa.me/244946470573?text=Ol%C3%A1");
  });
});
