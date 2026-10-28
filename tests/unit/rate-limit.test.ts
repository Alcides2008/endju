import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

describe("nextWindow", () => {
  it("conta dentro da janela, bloqueia acima do limite e recomeça depois", async () => {
    const { nextWindow } = await import("@/lib/rate-limit");
    let state = nextWindow(null, 0, 2, 1000);
    expect(state).toEqual({ count: 1, windowStart: 0, allowed: true });
    state = nextWindow(state, 500, 2, 1000);
    expect(state.allowed).toBe(true);
    state = nextWindow(state, 900, 2, 1000);
    expect(state).toEqual({ count: 3, windowStart: 0, allowed: false });
    expect(nextWindow(state, 1000, 2, 1000)).toEqual({ count: 1, windowStart: 1000, allowed: true });
  });
});
