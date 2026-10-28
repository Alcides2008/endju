import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "ENDJU BUSINESS · Gráfica e estúdio de design em Luanda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem das partilhas (WhatsApp, Facebook, LinkedIn) para as páginas sem imagem própria. */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/endju-logo.png"));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#f3f0e8",
        color: "#121116",
        borderBottom: "24px solid #d62c17",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${logo.toString("base64")}`}
        alt=""
        height={120}
        style={{ objectFit: "contain", alignSelf: "flex-start" }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>Gráfica e estúdio de design em Luanda</div>
        <div style={{ fontSize: 32, color: "#55525c" }}>
          Impressão, grande formato, branding e brindes · Orçamento online
        </div>
      </div>
    </div>,
    size,
  );
}
