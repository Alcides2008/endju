import { describe, expect, it } from "vitest";
import { dwell } from "@/components/three/dwell";

describe("dwell", () => {
  it("para exatamente em cada paragem", () => {
    expect(dwell(0, 4)).toBe(0);
    expect(dwell(1 / 3, 4)).toBeCloseTo(1 / 3);
    expect(dwell(2 / 3, 4)).toBeCloseTo(2 / 3);
    expect(dwell(1, 4)).toBe(1);
  });

  it("abranda perto das paragens e acelera entre elas", () => {
    const step = 0.01;
    const nearStop = dwell(step, 4) - dwell(0, 4);
    const midway = dwell(1 / 6 + step, 4) - dwell(1 / 6, 4);
    expect(nearStop).toBeLessThan(midway);
  });

  it("ignora valores fora de 0–1", () => {
    expect(dwell(-0.5, 4)).toBe(0);
    expect(dwell(1.5, 4)).toBe(1);
  });
});
