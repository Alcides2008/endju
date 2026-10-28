import { describe, expect, it } from "vitest";
import { postLoginPath, safeRedirectPath } from "@/lib/auth/redirect";
import { can } from "@/lib/domain/permissions";

describe("safeRedirectPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/conta/pedidos?estado=pronto")).toBe("/conta/pedidos?estado=pronto");
  });

  it.each(["https://site.com", "//site.com", "/\\site.com", "/\t/site.com", "conta", "", null])(
    "rejeita %j",
    (value) => {
      expect(safeRedirectPath(value)).toBeNull();
    },
  );
});

describe("postLoginPath", () => {
  it("leva cada papel para a sua casa", () => {
    expect(postLoginPath("cliente", null)).toBe("/conta");
    expect(postLoginPath("designer", null)).toBe("/admin");
  });

  it("não deixa um cliente voltar para o painel", () => {
    expect(postLoginPath("cliente", "/admin/pedidos")).toBe("/conta");
    expect(postLoginPath("gestor", "/admin/pedidos")).toBe("/admin/pedidos");
  });
});

describe("can", () => {
  it("segue a matriz por omissão", () => {
    expect(can("admin", "settings", "edit")).toBe(true);
    expect(can("gestor", "orders", "delete")).toBe(false);
    expect(can("financeiro", "finance", "approve")).toBe(true);
    expect(can("operador", "stock", "create")).toBe(true);
    expect(can("operador", "finance", "view")).toBe(false);
    expect(can("atendimento", "team", "view")).toBe(false);
    expect(can("cliente", "orders", "view")).toBe(false);
  });

  it("usa a matriz editada no painel, mas o Administrador tem sempre tudo", () => {
    const perms = { orders: "V", finance: "VA" };
    expect(can({ role: "operador", perms }, "finance", "approve")).toBe(true);
    expect(can({ role: "operador", perms }, "orders", "edit")).toBe(false);
    expect(can({ role: "operador", perms }, "stock", "create")).toBe(false);
    expect(can({ role: "admin", perms: {} }, "team", "edit")).toBe(true);
    expect(can({ role: "cliente", perms: { orders: "VCEXA" } }, "orders", "view")).toBe(false);
  });
});
