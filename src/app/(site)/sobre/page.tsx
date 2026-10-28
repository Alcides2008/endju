import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import bordadoOperador from "@/assets/portfolio/bordado-operador.webp";
import fachadaAtelier from "@/assets/portfolio/fachada-atelier-3.webp";
import oficinaLetras from "@/assets/portfolio/fachada-atelier-oficina.webp";
import lojaDia from "@/assets/portfolio/loja-endju-dia.webp";
import lojaNoite from "@/assets/portfolio/loja-endju-noite.webp";
import dtf from "@/assets/portfolio/t-shirts-jiu-jitsu-2.webp";
import { PageHeader } from "@/components/layout/page-header";
import { FinalCta } from "@/features/home/components/final-cta";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "A Endju é uma gráfica e estúdio de design em Luanda: design, impressão, bordado, letreiros e montagem com equipa própria.",
};

const PRINCIPLES = [
  {
    title: "Tudo sob o mesmo teto",
    text: "Design, impressão, bordado, corte e montagem acontecem na nossa oficina. Menos intermediários, menos atrasos e uma só pessoa a quem pedir contas.",
  },
  {
    title: "Montagem com equipa própria",
    text: "Subimos ao andaime para instalar lonas, letreiros e letras 3D, em Luanda e nas províncias.",
  },
  {
    title: "Nada vai para a máquina sem aprovação",
    text: "Cada trabalho passa por uma prova que aprovas online. Revês textos, cores e medidas antes de imprimirmos.",
  },
  {
    title: "Prazos que se cumprem",
    text: "Damos o prazo antes de começares e ele conta a partir da aprovação da prova. Se algo mudar, avisamos primeiro.",
  },
];

const WORKSHOP = [
  {
    src: bordadoOperador,
    alt: "Operador a acompanhar uma bordadora multicabeça",
    title: "Bordado",
    text: "Bordadoras multicabeça para polos, batas e bonés.",
  },
  {
    src: dtf,
    alt: "Equipa a preparar t-shirts para estampar em DTF",
    title: "Estampagem",
    text: "DTF e sublimação para t-shirts e equipamentos.",
  },
  {
    src: oficinaLetras,
    alt: "Letras de um letreiro a serem montadas na oficina",
    title: "Letreiros",
    text: "Letras 3D e caixas de luz montadas e testadas aqui.",
  },
  {
    src: fachadaAtelier,
    alt: "Equipa da Endju a montar um letreiro com andaime",
    title: "Montagem",
    text: "Instalação no local, com andaime e ferramenta própria.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="Sobre a Endju" title="Uma gráfica que também sobe ao andaime.">
        Somos uma gráfica e estúdio de design em Luanda. Desenhamos, imprimimos, bordamos e montamos, do cartão de
        visita à fachada luminosa.
      </PageHeader>

      <div className="container-page space-y-section pb-section">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <figure className="relative aspect-[16/10] overflow-hidden rounded-sm border border-line">
            <Image
              src={lojaNoite}
              alt="Fachada iluminada da loja Endju à noite, com a viatura da Efai Saúde estacionada"
              fill
              placeholder="blur"
              preload
              sizes="(min-width: 768px) 58vw, 100vw"
              className="object-cover"
            />
          </figure>
          <figure className="relative aspect-[16/10] overflow-hidden rounded-sm border border-line md:aspect-auto">
            <Image
              src={lojaDia}
              alt="Fachada da loja Endju de dia: publicidade, gráfica e confeção de uniformes"
              fill
              placeholder="blur"
              sizes="(min-width: 768px) 42vw, 100vw"
              className="object-cover"
            />
          </figure>
        </div>

        <section aria-labelledby="historia" className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <h2 id="historia" className="text-display-lg font-extrabold [font-stretch:85%]">
            Publicidade, gráfica e uniformes, como diz a fachada.
          </h2>
          <div className="space-y-5 text-lg text-ink-2">
            <p>
              Na Endju, o designer, a impressão, o bordado e a equipa de montagem estão na mesma casa. Uma marca não tem
              de andar de fornecedor em fornecedor para ter os cartões, a fachada e o fardamento a condizer.
            </p>
            <p>
              Trabalhamos para empresas, escolas, igrejas, centros médicos, lojas, organizadores de eventos e equipas
              desportivas. Alguns desses trabalhos estão no{" "}
              <Link href="/portfolio" className="text-ink underline decoration-brand decoration-2 underline-offset-4">
                portfólio
              </Link>
              , filmados na oficina e no local da montagem.
            </p>
          </div>
        </section>

        <section aria-labelledby="principios">
          <h2 id="principios" className="mb-10 eyebrow text-ink-3">
            Como trabalhamos
          </h2>
          <ol className="grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-2">
            {PRINCIPLES.map((item, i) => (
              <li key={item.title} className="reveal space-y-4 bg-card p-8 md:p-10">
                <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-display-sm font-bold">{item.title}</h3>
                <p className="text-ink-2">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="oficina">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 id="oficina" className="max-w-2xl text-display-lg font-extrabold [font-stretch:85%]">
              Dentro da oficina.
            </h2>
            <Link
              href="/servicos"
              className="inline-flex items-center gap-2 text-sm font-medium underline decoration-brand decoration-2 underline-offset-[6px]"
            >
              Ver os serviços <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {WORKSHOP.map((item) => (
              <li key={item.title} className="reveal space-y-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-line">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="-mt-2 text-sm text-ink-2">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <FinalCta />
    </>
  );
}
