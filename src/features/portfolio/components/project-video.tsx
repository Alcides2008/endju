"use client";

import { useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

/**
 * Capa fixa com o vídeo real por baixo: só descarrega e toca quando o rato passa por cima.
 * No telemóvel fica a capa, para não gastar dados a quem só está a ver a página.
 */
export function ProjectVideo({
  poster,
  video,
  alt,
  sizes,
}: {
  poster: StaticImageData;
  video: { src: string; posterTime: number } | null;
  alt: string;
  sizes: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void ref.current?.play().catch(() => {});
  };
  const stop = () => {
    ref.current?.pause();
    setPlaying(false);
  };

  return (
    <div
      className="relative h-full"
      onPointerEnter={video ? play : undefined}
      onPointerLeave={video ? stop : undefined}
    >
      <Image src={poster} alt={alt} fill sizes={sizes} placeholder="blur" className="object-cover" />
      {video && (
        <video
          ref={ref}
          src={`${video.src}#t=${video.posterTime}`}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onPlaying={() => setPlaying(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            playing ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
