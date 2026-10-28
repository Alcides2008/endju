import { PROCESS_STEPS } from "@/content/home";
import { SectionHeading } from "./section-heading";

/**
 * Linha do tempo do processo. A linha desenha-se com o scroll e os passos entram um a um
 * (scroll-driven animations em CSS; sem suporte fica tudo visível).
 */
export function ProcessSection() {
  return (
    <section aria-labelledby="processo" className="container-page py-section">
      <SectionHeading
        index="03"
        eyebrow="Como trabalhamos"
        title={<span id="processo">Do briefing à entrega, sem surpresas.</span>}
      />
      <ol className="relative grid gap-10 pl-10 md:grid-cols-5 md:gap-6 md:pt-12 md:pl-0">
        {/* Trilho e linha que se desenha (vertical no telemóvel, horizontal a partir de md) */}
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-[0.6875rem] w-px bg-line md:inset-x-0 md:top-[0.6875rem] md:bottom-auto md:h-px md:w-auto"
        />
        <span aria-hidden className="draw-y absolute top-2 bottom-2 left-[0.6875rem] w-px bg-brand md:hidden" />
        <span aria-hidden className="draw-x absolute inset-x-0 top-[0.6875rem] hidden h-px bg-brand md:block" />

        {PROCESS_STEPS.map((step, i) => (
          <li
            key={step.title}
            className="reveal relative space-y-3"
            style={{ animationRange: `entry ${i * 6}% cover ${32 + i * 6}%` }}
          >
            <span
              aria-hidden
              className="absolute top-0.5 -left-10 grid size-[1.375rem] place-items-center rounded-full border border-brand bg-paper md:-top-12 md:left-0"
            >
              <span className="size-2 rounded-full bg-brand" />
            </span>
            <p className="eyebrow text-brand">
              {String(i + 1).padStart(2, "0")} · {step.when}
            </p>
            <h3 className="text-display-sm font-bold">{step.title}</h3>
            <p className="text-sm text-ink-2">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
