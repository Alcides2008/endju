"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const INTERACTIVE = "a, button, label, summary, select, [role='button'], [role='tab'], [role='option'], [data-cursor]";

/**
 * Cursor personalizado: ponto que segue o rato + anel com atraso que cresce sobre elementos clicáveis.
 * `data-cursor-label="Ver"` mostra um rótulo dentro do anel. Desliga-se em ecrãs táteis e com movimento reduzido.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce || !dot.current || !ring.current || !label.current) return;

    const root = document.documentElement;
    const els = [dot.current, ring.current];
    gsap.set(els, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const dotX = gsap.quickTo(dot.current, "x", { duration: 0.1, ease: "power3" });
    const dotY = gsap.quickTo(dot.current, "y", { duration: 0.1, ease: "power3" });
    const ringX = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ringY = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });
    let visible = false;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
      if (!visible) {
        visible = true;
        root.classList.add("has-cursor");
        gsap.to(els, { autoAlpha: 1, duration: 0.2 });
      }
    };
    const hide = () => {
      visible = false;
      gsap.to(els, { autoAlpha: 0, duration: 0.2 });
    };
    const over = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(INTERACTIVE);
      const text = target?.dataset.cursorLabel ?? "";
      ring.current!.dataset.state = target ? (text ? "label" : "hover") : "";
      label.current!.textContent = text;
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    root.addEventListener("pointerleave", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      root.removeEventListener("pointerleave", hide);
      root.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] mix-blend-difference">
      <div
        ref={ring}
        className="invisible absolute top-0 left-0 grid size-9 place-items-center rounded-full border border-white/70 transition-[scale,background-color,border-color] duration-300 ease-out-expo data-[state=hover]:scale-[1.6] data-[state=hover]:border-white data-[state=label]:scale-[2.4] data-[state=label]:border-transparent data-[state=label]:bg-white"
      >
        <span ref={label} className="scale-[0.42] eyebrow font-medium text-black" />
      </div>
      <div ref={dot} className="invisible absolute top-0 left-0 size-1.5 rounded-full bg-white" />
    </div>
  );
}
