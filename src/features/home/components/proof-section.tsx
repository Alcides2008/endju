import { CLIENTS, STATS } from "@/content/home";
import { CountUp } from "./count-up";

// Cada nome de cliente com um tratamento tipográfico diferente, como uma parede de logótipos
const WORDMARKS = [
  "font-display text-3xl font-extrabold tracking-tight [font-stretch:75%]",
  "font-mono text-sm uppercase tracking-[0.3em]",
  "font-display text-2xl font-medium italic",
  "font-sans text-lg font-semibold uppercase tracking-[0.18em]",
  "font-display text-2xl font-bold [font-stretch:100%]",
  "font-mono text-base font-medium lowercase",
  "font-display text-3xl font-light tracking-tight",
];

/** Faixa escura (tokens do tema escuro só aqui): números e clientes. */
export function ProofSection() {
  return (
    <section aria-labelledby="numeros" className="dark overflow-hidden bg-paper py-section text-ink">
      <div className="container-page">
        <h2 id="numeros" className="sr-only">
          A Endju em números
        </h2>
        <dl className="grid gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="reveal flex flex-col border-l border-line pl-6">
              <dt className="order-2 mt-3 text-ink-2">{stat.label}</dt>
              <dd className="text-display-xl font-extrabold text-ink [font-stretch:80%]">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-24">
        <p className="container-page mb-8 eyebrow text-ink-3">Confiam na Endju</p>
        <div className="relative [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div className="marquee flex w-max items-center">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-16 pr-16">
                {CLIENTS.map((client, i) => (
                  <li key={client} className={`whitespace-nowrap text-ink-2 ${WORDMARKS[i % WORDMARKS.length]}`}>
                    {client}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
