import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("signParams", () => {
  it("segue o algoritmo do Cloudinary (exemplo da documentação)", async () => {
    const { signParams } = await import("@/lib/cloudinary");
    // Exemplo oficial: eager=w_400,h_300,c_pad|w_260,h_200,c_crop&public_id=sample_image&timestamp=1315060510 + "abcd"
    expect(
      signParams(
        { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" },
        "abcd",
      ),
    ).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
});

describe("parseCloudinaryUrl", () => {
  it("lê a linha da consola e recusa os marcadores por preencher", async () => {
    const { parseCloudinaryUrl } = await import("@/lib/cloudinary");
    expect(parseCloudinaryUrl("cloudinary://123456:abc-DEF_9@demo")).toEqual({
      apiKey: "123456",
      apiSecret: "abc-DEF_9",
      cloudName: "demo",
    });
    expect(parseCloudinaryUrl("cloudinary://<your_api_key>:<your_api_secret>@demo")).toBeNull();
    expect(parseCloudinaryUrl(undefined)).toBeNull();
  });
});

describe("privateDeliveryUrl", () => {
  it("assina o caminho com o segredo, como o Cloudinary pede para ficheiros authenticated", async () => {
    vi.stubEnv("CLOUDINARY_URL", "cloudinary://123:segredo@demo");
    vi.resetModules();
    const { privateDeliveryUrl } = await import("@/lib/cloudinary");
    const { createHash } = await import("node:crypto");
    const sig = createHash("sha1")
      .update("endju/x/a.jpgsegredo")
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .slice(0, 8);
    expect(privateDeliveryUrl("endju/x/a", "jpg")).toBe(
      `https://res.cloudinary.com/demo/image/authenticated/s--${sig}--/endju/x/a.jpg`,
    );
    vi.unstubAllEnvs();
  });
});
