import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/features/auth/schema";

describe("loginSchema", () => {
  it.each(["cliente@endju.ao", "923 456 789", "+244 923 456 789"])("aceita %j", (identifier) => {
    expect(loginSchema.safeParse({ identifier, password: "x" }).success).toBe(true);
  });

  it.each(["cliente@", "12345", ""])("rejeita %j", (identifier) => {
    expect(loginSchema.safeParse({ identifier, password: "x" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = { name: "Ana Kiala", email: "ana@kianda.ao", phone: "923 456 789", password: "12345678", terms: true };

  it("normaliza o telemóvel para E.164", () => {
    expect(registerSchema.parse(valid).phone).toBe("+244923456789");
  });

  it("exige telemóvel válido e termos aceites", () => {
    expect(registerSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, terms: false }).success).toBe(false);
  });
});
