"use client";

import { useEffect, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import cartoes from "@/assets/hero/cartoes.webp";
import cor from "@/assets/hero/cor.webp";
import grandeFormato from "@/assets/hero/grande-formato.webp";
import oficina from "@/assets/hero/oficina.webp";
import { RegistrationMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { HERO_CHAPTERS } from "@/content/home";

/** Uma fotografia por ecrã: a abertura e depois um por capítulo, pela mesma ordem de HERO_CHAPTERS. */
const PLATES: { src: StaticImageData; alt: string }[] = [
  {
    src: oficina,
    alt: "Cartões de visita, caixa kraft, leque de cores, rolo de vinil e provas de cor com a marca Endju",
  },
  {
    src: cartoes,
    alt: "Cartões de visita Endju em papel branco, com versos em degradê e um cartão preto com o logo a ouro",
  },
  { src: cor, alt: "Leque de cores aberto ao lado de uma prova de cor com o logo Endju e um conta-fios" },
  {
    src: grandeFormato,
    alt: "Roll-up com o logo Endju ao lado de caixas kraft impressas, uma aberta com papel de seda",
  },
];

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      // Troca de fotografia a meio de cada ecrã de scroll, ao mesmo tempo que o capítulo seguinte entra
      const plates = gsap.utils.toArray<HTMLElement>("[data-plate]");
      const swap = gsap.timeline({
        scrollTrigger: { trigger: section.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      plates.slice(1).forEach((plate, i) => {
        swap
          .to(plates[i], { autoAlpha: 0, scale: reduced ? 1 : 1.06, duration: 0.4, ease: "power1.inOut" }, i + 0.3)
          .fromTo(
            plate,
            { autoAlpha: 0, scale: reduced ? 1 : 0.94 },
            { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power1.inOut" },
            i + 0.3,
          );
      });
      swap.set({}, {}, plates.length - 1);
      if (reduced) return;

      gsap.to("[data-intro]", {
        autoAlpha: 0,
        y: -80,
        ease: "none",
        scrollTrigger: { trigger: section.current, start: "top top", end: "+=55%", scrub: true },
      });
      gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((chapter) => {
        gsap.fromTo(
          chapter.querySelectorAll("[data-reveal]"),
          { autoAlpha: 0, y: 56 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: chapter, start: "top 80%", end: "top 30%", scrub: true },
          },
        );
      });

      // Paralaxe: a fotografia inclina-se com o rato (desktop) ou com a inclinação do telemóvel
      const tiltX = gsap.quickTo(stage.current, "rotationX", { duration: 0.9, ease: "power3" });
      const tiltY = gsap.quickTo(stage.current, "rotationY", { duration: 0.9, ease: "power3" });
      const moveX = gsap.quickTo(stage.current, "x", { duration: 0.9, ease: "power3" });
      const moveY = gsap.quickTo(stage.current, "y", { duration: 0.9, ease: "power3" });
      gsap.set(stage.current, { transformPerspective: 1400 });
      const clamp = gsap.utils.clamp(-1, 1);
      const tilt = (nx: number, ny: number) => {
        tiltY(nx * 6);
        tiltX(ny * -4);
        moveX(nx * -14);
        moveY(ny * -10);
      };
      const onPointer = (event: PointerEvent) => {
        if (event.pointerType === "mouse")
          tilt((event.clientX / innerWidth) * 2 - 1, (event.clientY / innerHeight) * 2 - 1);
      };
      // shortcut: no iOS o giroscópio exige DeviceOrientationEvent.requestPermission() num toque; aí fica sem inclinação
      const onOrientation = ({ beta, gamma }: DeviceOrientationEvent) => {
        if (beta !== null && gamma !== null) tilt(clamp(gamma / 25), clamp((beta - 45) / 25));
      };
      addEventListener("pointermove", onPointer, { passive: true });
      addEventListener("deviceorientation", onOrientation);
      return () => {
        removeEventListener("pointermove", onPointer);
        removeEventListener("deviceorientation", onOrientation);
      };
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={section} aria-label="Apresentação da Endju" className="relative">
      {/* Camada fixa: as fotografias ficam paradas e trocam enquanto os capítulos passam por cima */}
      <div className="sticky top-0 h-lvh overflow-hidden">
        <div className="absolute inset-x-0 top-16 mx-auto aspect-square w-[min(100vw,54svh)] mask-plate md:inset-x-auto md:top-1/2 md:right-[-3vw] md:w-[min(100lvh,60vw)] md:-translate-y-1/2 md:mask-plate-side">
          <div ref={stage} className="absolute inset-0">
            {PLATES.map((plate, i) => (
              <div key={plate.alt} data-plate className={i === 0 ? "absolute inset-0" : "invisible absolute inset-0"}>
                <Image
                  src={plate.src}
                  alt={plate.alt}
                  fill
                  preload={i === 0}
                  placeholder={i === 0 ? "blur" : "empty"}
                  sizes="(min-width: 768px) 60vw, 100vw"
                  className="object-cover dark:brightness-90"
                />
              </div>
            ))}
          </div>
        </div>
        {/* Véu para o texto se ler sobre a fotografia: à esquerda no desktop, em baixo no telemóvel */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-paper via-paper/70 via-35% to-transparent to-60% md:bg-linear-to-r md:via-paper/55 md:via-30% md:to-55%" />
      </div>

      <div className="relative -mt-[100lvh]">
        <div data-intro className="container-page flex min-h-svh flex-col justify-end pt-28 pb-12 lg:pb-16">
          <p className="mb-6 flex items-center gap-3 eyebrow text-ink-2">
            <RegistrationMark className="text-brand" />
            Gráfica &amp; estúdio de design · Luanda
          </p>
          <h1 className="max-w-[12ch] text-display-xl font-extrabold [font-stretch:82%]">
            Imprimimos marcas que se veem <span className="text-brand">ao longe.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-ink-2">
            Do cartão de visita à lona de 12 metros: design, impressão e acabamento sob o mesmo teto, com prazos que
            cumprimos e provas que aprovas online.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/orcamento">
                Pedir orçamento <ArrowUpRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" data-cursor-label="Ver">
              <Link href="/portfolio">Ver trabalhos</Link>
            </Button>
          </div>
          <p className="mt-12 hidden items-center gap-2 eyebrow text-ink-3 md:flex">
            <ArrowDown className="size-3.5 animate-bounce" aria-hidden /> Desliza para entrar na oficina
          </p>
        </div>

        {HERO_CHAPTERS.map((chapter, i) => (
          <div
            key={chapter.title}
            data-chapter
            className="container-page flex min-h-svh items-end pb-16 md:items-center md:pb-0"
          >
            <div className="max-w-md space-y-5">
              <p data-reveal className="flex items-center gap-3 eyebrow text-ink-3">
                <span className="text-brand">
                  {String(i + 1).padStart(2, "0")} / {String(HERO_CHAPTERS.length).padStart(2, "0")}
                </span>
                {chapter.eyebrow}
              </p>
              <h2 data-reveal className="text-display-lg font-extrabold [font-stretch:85%]">
                {chapter.title}
              </h2>
              <p data-reveal className="text-lg text-ink-2">
                {chapter.text}
              </p>
              {i === HERO_CHAPTERS.length - 1 && (
                <div data-reveal>
                  <Button asChild variant="ink">
                    <Link href="/servicos">
                      Ver todos os serviços <ArrowUpRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
