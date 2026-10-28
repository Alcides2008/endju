import Image from "next/image";
import type { ProjectBase } from "@/lib/domain/content";

/** Antes e depois lado a lado (os fotogramas nem sempre têm o mesmo enquadramento, por isso não há cortina). */
export function BeforeAfter({ pair }: { pair: NonNullable<ProjectBase["beforeAfter"]> }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[pair.before, pair.after].map((image, i) => (
        <figure key={image.label} className="reveal space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm border border-line bg-paper-2">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              placeholder="blur"
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            <span className="absolute top-4 left-4 rounded-full bg-paper/90 px-3 py-1.5 eyebrow text-ink backdrop-blur">
              <span className="text-brand">{i === 0 ? "Antes" : "Depois"}</span> · {image.label}
            </span>
          </div>
          <figcaption className="text-sm text-ink-3">{image.alt}</figcaption>
        </figure>
      ))}
    </div>
  );
}
