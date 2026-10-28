import { getAllTestimonials } from "@/features/content/server";
import { SectionHeading } from "./section-heading";

export async function TestimonialsSection() {
  const testimonials = (await getAllTestimonials()).filter((t) => t.active);
  if (testimonials.length === 0) return null;
  return (
    <section aria-labelledby="testemunhos" className="container-page py-section">
      <SectionHeading
        index="04"
        eyebrow="Testemunhos"
        title={<span id="testemunhos">Quem imprime connosco, volta.</span>}
      />
      {/* Telemóvel: deslizar na horizontal; desktop: três colunas */}
      <ul className="-mx-gutter flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-gutter pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
        {testimonials.map((item, i) => (
          <li
            key={item.id}
            className="reveal w-[85%] shrink-0 snap-start md:w-auto"
            style={{ animationRange: `entry ${i * 8}% cover ${35 + i * 8}%` }}
          >
            <figure className="flex h-full flex-col justify-between gap-10 rounded-sm border border-line bg-card p-7 md:p-9">
              <blockquote className="space-y-5">
                <span aria-hidden className="block font-display text-6xl leading-none text-brand">
                  “
                </span>
                <p className="font-display text-xl leading-snug font-medium text-ink md:text-[1.375rem]">
                  {item.quote}
                </p>
              </blockquote>
              <figcaption className="flex items-center gap-4 border-t border-line pt-5">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-bold text-paper"
                >
                  {item.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span>
                  <span className="block font-medium text-ink">{item.name}</span>
                  <span className="block text-sm text-ink-3">
                    {item.role}, {item.company}
                  </span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
