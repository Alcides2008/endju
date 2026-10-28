import "server-only";
import { createHash } from "node:crypto";

/**
 * Cloudinary (decisão 5: imagens públicas e pré-visualizações de provas). O browser envia o ficheiro direto
 * para o Cloudinary com uma assinatura feita aqui; o segredo nunca sai do servidor.
 */
/**
 * A linha que a consola do Cloudinary dá: cloudinary://chave:segredo@nuvem. Recusa a linha com os marcadores
 * por preencher (<your_api_secret>), para não parecer configurado e depois falhar todas as assinaturas.
 */
export function parseCloudinaryUrl(url: string | undefined) {
  const match = url?.trim().match(/^cloudinary:\/\/([^:<>\s]+):([^@<>\s]+)@([^<>\s/]+)$/);
  return match ? { apiKey: match[1], apiSecret: match[2], cloudName: match[3] } : null;
}

// CLOUDINARY_URL, ou as três variáveis à parte
const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
const cloudName = fromUrl?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = fromUrl?.apiKey ?? process.env.CLOUDINARY_API_KEY;
const apiSecret = fromUrl?.apiSecret ?? process.env.CLOUDINARY_API_SECRET;

export const cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

/** Assinatura de upload: parâmetros por ordem alfabética, "chave=valor" unidos por "&", mais o segredo, em SHA-1. */
export function signParams(params: Record<string, string | number>, secret = apiSecret ?? "") {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1")
    .update(payload + secret)
    .digest("hex");
}

/** Formatos aceites em cada envio: o Cloudinary recusa o resto (executáveis, SVG com scripts, HTML). */
export const UPLOAD_FORMATS = {
  image: "jpg,jpeg,png,webp,avif,gif",
  document: "jpg,jpeg,png,webp,heic,tif,tiff,pdf",
} as const;

/**
 * Assinatura de envio. `private` guarda o ficheiro como "authenticated": só abre com um URL assinado aqui
 * (comprovativos de pagamento, com dados bancários do cliente). O browser junta `fields` ao FormData tal como vêm.
 */
export function signedUpload(
  folder: string,
  options: { private?: boolean; formats?: keyof typeof UPLOAD_FORMATS } = {},
) {
  if (!cloudinaryConfigured) return null;
  const params: Record<string, string | number> = {
    allowed_formats: UPLOAD_FORMATS[options.formats ?? "image"],
    folder,
    timestamp: Math.floor(Date.now() / 1000),
    ...(options.private ? { type: "authenticated" } : {}),
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    fields: { ...params, api_key: apiKey!, signature: signParams(params) },
  };
}

/** URL assinado de um ficheiro privado (authenticated). shortcut: o URL não expira; com tokens de acesso, expiraria. */
export function privateDeliveryUrl(publicId: string, format: string) {
  const path = `${publicId}.${format}`;
  const signature = createHash("sha1")
    .update(path + (apiSecret ?? ""))
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .slice(0, 8);
  return `https://res.cloudinary.com/${cloudName}/image/authenticated/s--${signature}--/${path}`;
}

/** URL de entrega construída aqui a partir do public_id (não se confia no URL que o browser devolve). */
export function deliveryUrl(publicId: string, format: string, transform = "f_auto,q_auto") {
  if (format === "pdf")
    return `https://res.cloudinary.com/${cloudName}/image/upload/pg_1,w_2400,f_jpg,q_auto/${publicId}.jpg`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}.${format}`;
}
