import type { StaticImageData } from "next/image";
import { ASSETS } from "@/content/assets";

/**
 * Imagem guardada no Firestore (docs/02 · Media): "asset:<chave>" para as fotografias empacotadas no site
 * ou o URL do Cloudinary, com as medidas, para as que a equipa carrega no painel.
 */
export type Media = { src: string; alt: string; width?: number; height?: number };

/** Imagem pronta para o next/image: o mesmo formato de um import estático, por isso os componentes não mudam. */
export type SiteImage = { src: StaticImageData; alt: string };

// Fundo cinzento enquanto carrega: as imagens do Cloudinary não trazem miniatura desfocada
const PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMyYTJhMmUiLz48L3N2Zz4=";

export function resolveMedia(media: Media | null | undefined): SiteImage | null {
  if (!media?.src) return null;
  if (media.src.startsWith("asset:")) {
    const asset = ASSETS[media.src.slice(6)];
    return asset ? { src: asset, alt: media.alt } : null;
  }
  if (!media.src.startsWith("https://res.cloudinary.com/") || !media.width || !media.height) return null;
  return {
    src: { src: media.src, width: media.width, height: media.height, blurDataURL: PLACEHOLDER },
    alt: media.alt,
  };
}

/** O contrário, para importar o conteúdo que estava no código: encontra a chave da fotografia empacotada. */
export function toMedia(image: { src: StaticImageData; alt: string }): Media {
  const key = Object.keys(ASSETS).find((k) => ASSETS[k].src === image.src.src);
  if (!key) throw new Error(`Imagem fora da biblioteca: ${image.src.src}`);
  return { src: `asset:${key}`, alt: image.alt };
}

/** Biblioteca para escolher no painel. */
export const ASSET_KEYS = Object.keys(ASSETS);
