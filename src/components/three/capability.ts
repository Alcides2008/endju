/**
 * Nível de 3D por aparelho:
 * - none: sem WebGL, movimento reduzido, poupança de dados ou rede 2G → ilustração estática
 * - low: telemóveis, rede 3G, máquinas modestas e GPU por software → cena leve (sem sombras em tempo real,
 *   menos objetos, dpr 1). Se mesmo assim os fotogramas não chegarem, a cena troca sozinha para a ilustração.
 * - high: desktop capaz → cena completa
 * Para testar noutro nível: ?cena=alta | leve | estatica
 */
export type Tier = "none" | "low" | "high";

export type Capability = {
  webgl: boolean;
  /** WebGL emulado no CPU (SwiftShader, llvmpipe, Microsoft Basic Render Driver): só a cena leve */
  softwareRenderer?: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
  cores?: number;
  memoryGb?: number;
  coarsePointer: boolean;
};

export function pickTier(c: Capability): Tier {
  if (!c.webgl || c.reducedMotion || c.saveData || c.effectiveType === "2g" || c.effectiveType === "slow-2g") {
    return "none";
  }
  if (
    c.softwareRenderer ||
    c.coarsePointer ||
    c.effectiveType === "3g" ||
    (c.cores ?? 8) <= 4 ||
    (c.memoryGb ?? 8) <= 4
  ) {
    return "low";
  }
  return "high";
}

const OVERRIDE: Record<string, Tier> = { alta: "high", leve: "low", estatica: "none" };

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

function probeWebgl() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return { webgl: false, softwareRenderer: false };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext(); // não ficar com um contexto WebGL a mais
    return { webgl: true, softwareRenderer: /swiftshader|llvmpipe|basic render driver|software/i.test(renderer) };
  } catch {
    return { webgl: false, softwareRenderer: false };
  }
}

export function detectTier(): Tier {
  const forced = OVERRIDE[new URLSearchParams(location.search).get("cena") ?? ""];
  if (forced) return forced;
  const nav = navigator as NavigatorExtras;
  return pickTier({
    ...probeWebgl(),
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: Boolean(nav.connection?.saveData),
    effectiveType: nav.connection?.effectiveType,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    coarsePointer: matchMedia("(pointer: coarse)").matches,
  });
}
