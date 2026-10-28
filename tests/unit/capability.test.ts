import { describe, expect, it } from "vitest";
import { pickTier, type Capability } from "@/components/three/capability";

const desktop: Capability = {
  webgl: true,
  reducedMotion: false,
  saveData: false,
  cores: 12,
  memoryGb: 16,
  coarsePointer: false,
};

describe("pickTier", () => {
  it("desktop capaz recebe a cena completa", () => {
    expect(pickTier(desktop)).toBe("high");
  });

  it.each<[string, Partial<Capability>]>([
    ["telemóvel", { coarsePointer: true }],
    ["4 núcleos", { cores: 4 }],
    ["4 GB de memória", { memoryGb: 4 }],
    ["rede 3G", { effectiveType: "3g" }],
    ["GPU por software", { softwareRenderer: true }],
  ])("%s recebe a cena leve", (_, change) => {
    expect(pickTier({ ...desktop, ...change })).toBe("low");
  });

  it.each<[string, Partial<Capability>]>([
    ["sem WebGL", { webgl: false }],
    ["movimento reduzido", { reducedMotion: true }],
    ["poupança de dados", { saveData: true }],
    ["rede 2G", { effectiveType: "2g" }],
  ])("%s recebe a ilustração estática", (_, change) => {
    expect(pickTier({ ...desktop, ...change })).toBe("none");
  });
});
