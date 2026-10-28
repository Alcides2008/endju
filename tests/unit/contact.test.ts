import { describe, expect, it } from "vitest";
import { contactSchema } from "@/features/contact/schema";
import { searchTokens } from "@/lib/domain/search";

describe("contactSchema", () => {
  const valid = {
    name: "Ana Kiala",
    phone: "923 456 789",
    email: "",
    company: "",
    subject: "orcamento",
    message: "Preciso de 500 cartões de visita.",
    consent: true,
  };

  it("aceita sem email e normaliza o telemóvel", () => {
    expect(contactSchema.parse(valid).phone).toBe("+244923456789");
  });

  it("rejeita telemóvel inválido, assunto desconhecido, mensagem curta e sem consentimento", () => {
    expect(contactSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, subject: "spam" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: "Olá" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("rejeita o campo escondido preenchido", () => {
    expect(contactSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });
});

describe("searchTokens", () => {
  it("gera prefixos sem acentos nem maiúsculas", () => {
    const tokens = searchTokens("Ana Kiala", "Kiandá");
    expect(tokens).toEqual(expect.arrayContaining(["a", "an", "ana", "k", "ki", "kiala", "kianda"]));
    expect(tokens).not.toContain("kiandá");
  });

  it("ignora valores vazios e não repete tokens", () => {
    const tokens = searchTokens("ana", undefined, "", "ana");
    expect(tokens).toEqual(["a", "an", "ana"]);
  });
});
