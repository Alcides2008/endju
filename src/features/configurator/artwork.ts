import type { ArtworkCheck } from "@/features/cart/store";

/**
 * Verificação do ficheiro no browser (docs/04 · Upload e preflight, primeira parte): formato, tamanho e,
 * em PNG/JPG, a resolução no tamanho final. PDF, AI, PSD e TIFF ficam para a verificação na oficina.
 * shortcut: sem upload até o Firebase Storage estar ativo (decisão da Etapa 4); o cliente envia o ficheiro por WhatsApp.
 */
export type FileRequirements = { formats: string[]; minDpi: number; bleedMm: number; maxSizeMb: number };

export const RASTER_FORMATS = ["png", "jpg", "jpeg"];

export function fileFormat(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function checkArtwork(
  file: { name: string; sizeBytes: number; widthPx?: number; heightPx?: number },
  requirements: FileRequirements,
  printCm: { width: number; height: number } | null,
): ArtworkCheck | { error: string } {
  const format = fileFormat(file.name);
  const accepted = requirements.formats.includes(format === "jpeg" ? "jpg" : format === "tif" ? "tiff" : format);
  if (!accepted) {
    return {
      error: `Formato .${format || "?"} não aceite. Usa ${requirements.formats.map((f) => f.toUpperCase()).join(", ")}.`,
    };
  }
  if (file.sizeBytes > requirements.maxSizeMb * 1024 * 1024) {
    return { error: `O ficheiro tem mais de ${requirements.maxSizeMb} MB. Comprime-o ou envia-o por WhatsApp.` };
  }

  const base = { name: file.name, sizeBytes: file.sizeBytes, format };
  if (!RASTER_FORMATS.includes(format) || !file.widthPx || !file.heightPx || !printCm) {
    return {
      ...base,
      status: "por_verificar",
      messages: [
        `Verificamos sangria (${requirements.bleedMm} mm), cores e resolução na oficina antes de te enviarmos a prova.`,
      ],
    };
  }

  // A arte pode vir deitada ou de pé (o designer roda-a): compara com o formato na mesma orientação
  const turned = file.widthPx >= file.heightPx !== printCm.width >= printCm.height;
  const print = turned ? { width: printCm.height, height: printCm.width } : printCm;
  // DPI no tamanho final: o lado que ficar com menos pontos por polegada manda
  const dpi = Math.floor(Math.min(file.widthPx / (print.width / 2.54), file.heightPx / (print.height / 2.54)));
  const warnings: string[] = [];
  if (dpi < requirements.minDpi) {
    warnings.push(
      `Resolução de ${dpi} dpi no tamanho final; recomendamos ${requirements.minDpi} dpi. Pode sair desfocado.`,
    );
  }
  if (Math.abs(file.widthPx / file.heightPx / (print.width / print.height) - 1) > 0.04) {
    warnings.push("A proporção da imagem não coincide com o formato: pode haver corte ou margens brancas.");
  }
  const bleed =
    requirements.bleedMm > 0 ? [`Confirma que a arte tem ${requirements.bleedMm} mm de sangria em cada lado.`] : [];
  return {
    ...base,
    widthPx: file.widthPx,
    heightPx: file.heightPx,
    dpi,
    status: warnings.length > 0 ? "avisos" : "ok",
    messages: [...warnings, ...bleed],
  };
}
