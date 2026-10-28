import { describe, expect, it } from "vitest";
import { checkArtwork } from "@/features/configurator/artwork";

const req = { formats: ["pdf", "ai", "psd", "png", "jpg", "tiff"], minDpi: 300, bleedMm: 3, maxSizeMb: 100 };
const card = { width: 8.5, height: 5.5 };

describe("checkArtwork", () => {
  it("aceita um PNG com 300 dpi no tamanho do cartão", () => {
    const result = checkArtwork({ name: "cartao.png", sizeBytes: 2e6, widthPx: 1004, heightPx: 650 }, req, card);
    expect(result).toMatchObject({ status: "ok", dpi: 300 });
  });

  it("avisa em baixa resolução e proporção errada, sem bloquear", () => {
    const result = checkArtwork({ name: "logo.jpg", sizeBytes: 3e5, widthPx: 500, heightPx: 500 }, req, card);
    expect(result).toMatchObject({ status: "avisos" });
    if ("messages" in result) expect(result.messages.length).toBe(3);
  });

  it("aceita a arte deitada ou de pé", () => {
    const result = checkArtwork({ name: "vertical.png", sizeBytes: 2e6, widthPx: 650, heightPx: 1004 }, req, card);
    expect(result).toMatchObject({ status: "ok" });
  });

  it("deixa PDF, AI e PSD para a verificação na oficina", () => {
    expect(checkArtwork({ name: "arte.PDF", sizeBytes: 5e6 }, req, card)).toMatchObject({ status: "por_verificar" });
  });

  it("recusa formatos não aceites e ficheiros grandes demais", () => {
    expect(checkArtwork({ name: "arte.docx", sizeBytes: 1e5 }, req, card)).toHaveProperty("error");
    expect(checkArtwork({ name: "arte.pdf", sizeBytes: 101 * 1024 * 1024 }, req, card)).toHaveProperty("error");
  });
});
