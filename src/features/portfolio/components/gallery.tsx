import Image, { type StaticImageData } from "next/image";

/** Galeria em colunas: cada imagem mantém a proporção original (fotogramas verticais e horizontais). */
export function Gallery({ images }: { images: { src: StaticImageData; alt: string; caption?: string }[] }) {
  return (
    <ul className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>li]:mb-6">
      {images.map((image) => (
        <li key={image.src.src} className="reveal break-inside-avoid">
          <figure className="space-y-3">
            <Image
              src={image.src}
              alt={image.alt}
              placeholder="blur"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-auto w-full rounded-sm border border-line"
            />
            {image.caption && <figcaption className="eyebrow text-ink-3">{image.caption}</figcaption>}
          </figure>
        </li>
      ))}
    </ul>
  );
}
