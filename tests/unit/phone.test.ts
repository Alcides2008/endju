import { describe, expect, it } from "vitest";
import { formatPhone, toE164 } from "@/lib/domain/phone";

describe("toE164", () => {
  it.each([
    ["923 456 789", "+244923456789"],
    ["923-456-789", "+244923456789"],
    ["244923456789", "+244923456789"],
    ["00244 923 456 789", "+244923456789"],
    ["+244 923 456 789", "+244923456789"],
    ["+351 912 345 678", "+351912345678"],
  ])("%s → %s", (input, expected) => {
    expect(toE164(input)).toBe(expected);
  });

  it.each(["22 123 456", "823456789", "abc", ""])("rejeita %j", (input) => {
    expect(toE164(input)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("agrupa números angolanos", () => {
    expect(formatPhone("+244923456789")).toBe("+244 923 456 789");
  });
});
