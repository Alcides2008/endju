"use server";

import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { cloudinaryConfigured, deliveryUrl, signedUpload } from "@/lib/cloudinary";
import { adminDb } from "@/lib/firebase/admin";
import type { Media } from "@/lib/media";
import { staffCan } from "./guard";

const FOLDER = "endju/site";

/** Quem edita catálogo, portfólio ou conteúdos pode carregar imagens do site. */
async function editor() {
  return (
    (await staffCan("portfolio", "edit")) ?? (await staffCan("cms", "edit")) ?? (await staffCan("catalog", "edit"))
  );
}

/** Assinatura para o browser enviar a imagem direto para o Cloudinary (o segredo nunca sai do servidor). */
export async function signSiteUpload() {
  if (!(await editor())) return { ok: false as const, message: "Não tens permissão para carregar imagens." };
  const signed = signedUpload(FOLDER);
  if (!signed)
    return { ok: false as const, message: "O Cloudinary não está configurado (CLOUDINARY_URL no .env.local)." };
  return { ok: true as const, signed };
}

const uploaded = z.object({
  publicId: z.string().startsWith(`${FOLDER}/`).max(200),
  format: z.enum(["jpg", "jpeg", "png", "webp", "avif", "gif"]),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000),
  alt: z.string().trim().max(200),
});

/**
 * Regista a imagem carregada na biblioteca (coleção `media`), para voltar a ser usada noutros sítios.
 * O URL constrói-se aqui a partir do public_id, não se confia no que o browser devolve.
 */
export async function saveUploadedMedia(input: z.input<typeof uploaded>) {
  const user = await editor();
  if (!user) return { ok: false as const, message: "Não tens permissão para carregar imagens." };
  const parsed = uploaded.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Imagem inválida." };
  const { publicId, format, width, height, alt } = parsed.data;
  const media: Media = { src: deliveryUrl(publicId, format), alt, width, height };
  await adminDb()
    .collection("media")
    .add({ ...media, publicId, uploadedBy: user.uid, uploadedAt: Timestamp.now() });
  return { ok: true as const, media };
}

/** Imagens já carregadas, as mais recentes primeiro. shortcut: as últimas 120; com mais, juntar pesquisa. */
export async function listUploadedMedia(): Promise<{ cloudinary: boolean; items: Media[] }> {
  if (!(await editor())) return { cloudinary: cloudinaryConfigured, items: [] };
  const snap = await adminDb().collection("media").orderBy("uploadedAt", "desc").limit(120).get();
  return {
    cloudinary: cloudinaryConfigured,
    items: snap.docs.map((d) => ({
      src: d.get("src"),
      alt: d.get("alt") ?? "",
      width: d.get("width"),
      height: d.get("height"),
    })),
  };
}
