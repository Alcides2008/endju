import { z } from "zod";

/** Imagem guardada num conteúdo: fotografia empacotada no site ou URL do Cloudinary (com medidas). */
export const mediaSchema = z.object({
  src: z.string().regex(/^(asset:[\w/-]+|https:\/\/res\.cloudinary\.com\/\S+)$/, "Imagem inválida."),
  alt: z.string().trim().max(200),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
