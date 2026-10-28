import { CanvasTexture, NoColorSpace, SRGBColorSpace, type Texture } from "three";

/**
 * Artes "impressas" dos objetos 3D, desenhadas em canvas com as fontes do site.
 * Sem imagens para descarregar: a cena pesa só o código.
 */

// Famílias geradas pelo next/font, lidas das variáveis CSS depois de as fontes carregarem
let DISPLAY = "sans-serif";
let MONO = "monospace";
let TEXT = "sans-serif";
const cssFont = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const PROCESS = { cyan: "#00a3e0", magenta: "#e6007e", yellow: "#ffe500", key: "#16151a" };

export const BRAND = { red: "#e0301a", orange: "#f08000", yellow: "#f7b500" };

// Logótipo oficial (a cores e em branco), carregado uma vez para as artes impressas
const logos: { color?: HTMLImageElement; white?: HTMLImageElement } = {};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Garante fontes e logótipo antes de desenhar (senão o canvas usa a fonte do sistema e fica sem marca). */
export async function loadTextureAssets() {
  DISPLAY = cssFont("--font-bricolage") || DISPLAY;
  MONO = cssFont("--font-plex-mono") || MONO;
  TEXT = cssFont("--font-instrument") || TEXT;
  const [color, white] = await Promise.all([
    loadImage("/brand/endju-logo.png"),
    loadImage("/brand/endju-logo-white.png"),
    document.fonts.load(`800 100px ${DISPLAY}`),
    document.fonts.load(`500 40px ${MONO}`),
    document.fonts.load(`500 40px ${TEXT}`),
  ]);
  logos.color = color;
  logos.white = white;
}

/** Desenha o logótipo com a largura dada, centrado em (cx, cy). */
function logo(ctx: CanvasRenderingContext2D, kind: "color" | "white", cx: number, cy: number, width: number) {
  const img = logos[kind];
  if (!img) return;
  const height = (width * img.naturalHeight) / img.naturalWidth;
  ctx.drawImage(img, cx - width / 2, cy - height / 2, width, height);
}

function make(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Igual a make(), mas para mapas de dados (metalness/roughness): sem espaço de cor sRGB. */
function makeData(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const texture = make(width, height, draw);
  texture.colorSpace = NoColorSpace;
  return texture;
}

function font(ctx: CanvasRenderingContext2D, weight: number, size: number, family: string, stretch = "normal") {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fontStretch = stretch as CanvasFontStretch;
}

function registrationMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
}

/** Fibras subtis de papel ou kraft. */
function fibers(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, count: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * Math.PI;
    const l = 4 + Math.random() * 14;
    ctx.globalAlpha = 0.15 + Math.random() * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── Cartões de visita (85 × 55 mm → 1024 × 662) ──────────────────────────────

export function endjuCardFront() {
  return make(1024, 662, (ctx, w, h) => {
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(0, 0, w, h);
    logo(ctx, "color", 300, 250, 460);
    ctx.fillStyle = PROCESS.key;
    font(ctx, 600, 36, TEXT);
    ctx.fillText("Ana Kiala", 78, 540);
    font(ctx, 500, 28, TEXT);
    ctx.fillStyle = "#4a4751";
    ctx.fillText("Diretora de Arte · Luanda", 78, 584);
    // Faixa CMYK no canto
    [PROCESS.cyan, PROCESS.magenta, PROCESS.yellow, PROCESS.key].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(w - 76, 64 + i * 56, 20, 46);
    });
  });
}

export function endjuCardBack() {
  return make(1024, 662, (ctx, w, h) => {
    // A chama do logótipo: vermelho → laranja → amarelo
    const flame = ctx.createLinearGradient(0, h, w, 0);
    flame.addColorStop(0, BRAND.red);
    flame.addColorStop(0.65, BRAND.orange);
    flame.addColorStop(1, BRAND.yellow);
    ctx.fillStyle = flame;
    ctx.fillRect(0, 0, w, h);
    logo(ctx, "white", w / 2, h / 2, 560);
  });
}

/** Cartão preto com hot stamping a ouro: cor + mapa de metal (só as letras são metálicas). */
export function foilCard(): { map: Texture; metalnessMap: Texture; roughnessMap: Texture } {
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, ink: string) => {
    ctx.textAlign = "center";
    font(ctx, 700, 150, DISPLAY, "condensed");
    ctx.fillStyle = ink;
    ctx.fillText("KIANDA", w / 2, h / 2 + 20);
    font(ctx, 500, 30, MONO);
    ctx.fillText("E V E N T O S  ·  L U A N D A", w / 2, h / 2 + 90);
    ctx.lineWidth = 3;
    ctx.strokeStyle = ink;
    ctx.strokeRect(40, 40, w - 80, h - 80);
  };
  return {
    map: make(1024, 662, (ctx, w, h) => {
      ctx.fillStyle = "#111014";
      ctx.fillRect(0, 0, w, h);
      draw(ctx, w, h, "#d8b25c");
    }),
    metalnessMap: makeData(1024, 662, (ctx, w, h) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
      draw(ctx, w, h, "#ffffff");
    }),
    roughnessMap: makeData(1024, 662, (ctx, w, h) => {
      ctx.fillStyle = "#e6e6e6"; // papel preto mate
      ctx.fillRect(0, 0, w, h);
      draw(ctx, w, h, "#4d4d4d"); // folha a ouro polida
    }),
  };
}

export function kraftCardFront() {
  return make(1024, 662, (ctx, w, h) => {
    ctx.fillStyle = "#c19a6b";
    ctx.fillRect(0, 0, w, h);
    fibers(ctx, w, h, "#7d5a36", 1400);
    ctx.fillStyle = "#1d3a2f";
    font(ctx, 800, 92, DISPLAY, "semi-condensed");
    ctx.fillText("Mutamba", 80, 300);
    font(ctx, 500, 30, MONO);
    ctx.fillText("FARMÁCIA · DESDE 1998", 84, 360);
    ctx.fillStyle = "#0a7a4f";
    ctx.fillRect(w - 230, h - 230, 130, 40);
    ctx.fillRect(w - 185, h - 275, 40, 130);
  });
}

// ── Leque de cores (tira de 4,5 × 21 cm → 256 × 1200) ────────────────────────

export function swatchStrip(base: string, label: string, code: string) {
  return make(256, 1200, (ctx, w, h) => {
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(0, 0, w, h);
    const rows = 5;
    const rowH = 196;
    for (let i = 0; i < rows; i++) {
      ctx.fillStyle = base;
      ctx.globalAlpha = 1 - i * 0.18;
      ctx.fillRect(14, 14 + i * (rowH + 8), w - 28, rowH);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PROCESS.key;
    font(ctx, 600, 26, MONO);
    ctx.fillText(label, 18, h - 128);
    font(ctx, 400, 20, MONO);
    ctx.fillStyle = "#4a4751";
    ctx.fillText(code, 18, h - 92);
    // Furo do eixo
    ctx.fillStyle = "#c9c3b6";
    ctx.beginPath();
    ctx.arc(w / 2, h - 40, 14, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── Lona impressa (Gala da Kianda Eventos) ──────────────────────────────────

export function galaBanner() {
  return make(1600, 1200, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0d1a3c");
    g.addColorStop(1, "#1d2f66");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Raios de luz
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#d8b25c";
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2, -80);
      ctx.lineTo(i * 200 - 40, h);
      ctx.lineTo(i * 200 + 40, h);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8c879";
    font(ctx, 500, 44, MONO);
    ctx.fillText("K I A N D A   E V E N T O S   A P R E S E N T A", w / 2, 300);
    font(ctx, 800, 330, DISPLAY, "condensed");
    ctx.fillText("GALA", w / 2, 640);
    font(ctx, 700, 120, DISPLAY, "condensed");
    ctx.fillStyle = "#ffffff";
    ctx.fillText("EMPRESARIAL 2026", w / 2, 790);
    font(ctx, 500, 40, TEXT);
    ctx.fillStyle = "#c9d2ee";
    ctx.fillText("Centro de Convenções de Talatona · 12 de dezembro", w / 2, 900);
    // Marcas de corte nos cantos (ficheiro de produção)
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    for (const [x, y] of [
      [40, 40],
      [w - 40, 40],
      [40, h - 40],
      [w - 40, h - 40],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x - 24, y);
      ctx.lineTo(x + 24, y);
      ctx.moveTo(x, y - 24);
      ctx.lineTo(x, y + 24);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

export function bannerBack() {
  return make(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#f2f2ef";
    ctx.fillRect(0, 0, w, h);
  });
}

/** Arte de exemplo para roll-ups e lonas na proporção pedida: a chama do logótipo com a marca a branco. */
export function endjuBanner(aspect: number) {
  const w = aspect >= 1 ? 1600 : Math.round(1600 * aspect);
  const h = aspect >= 1 ? Math.round(1600 / aspect) : 1600;
  return make(Math.max(w, 64), Math.max(h, 64), (ctx, cw, ch) => {
    const flame = ctx.createLinearGradient(0, ch, cw, 0);
    flame.addColorStop(0, BRAND.red);
    flame.addColorStop(0.65, BRAND.orange);
    flame.addColorStop(1, BRAND.yellow);
    ctx.fillStyle = flame;
    ctx.fillRect(0, 0, cw, ch);
    const unit = Math.min(cw, ch);
    logo(ctx, "white", cw / 2, ch * 0.42, Math.min(cw * 0.7, unit * 1.3));
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    font(ctx, 800, unit * 0.075, DISPLAY, "82%");
    ctx.fillText("Imprimimos marcas que se veem ao longe.", cw / 2, ch * 0.78, cw * 0.86);
  });
}

// ── Caixa kraft personalizada ───────────────────────────────────────────────

export function kraftBoxPrint() {
  return make(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = "#b98b5e";
    ctx.fillRect(0, 0, w, h);
    fibers(ctx, w, h, "#6d4a2a", 2200);
    logo(ctx, "color", w / 2, 360, 600);
    ctx.textAlign = "center";
    ctx.fillStyle = "#2a1c12";
    font(ctx, 500, 30, MONO);
    ctx.fillText("F E I T O   E M   L U A N D A", w / 2, 570);
  });
}

export function kraftPlain() {
  return make(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#b98b5e";
    ctx.fillRect(0, 0, w, h);
    fibers(ctx, w, h, "#6d4a2a", 900);
  });
}

// ── Folha de máquina (prova de impressão) ───────────────────────────────────

export function pressSheet() {
  return make(1024, 1448, (ctx, w, h) => {
    ctx.fillStyle = "#fbfaf6";
    ctx.fillRect(0, 0, w, h);
    fibers(ctx, w, h, "#d8d2c4", 500);
    // Barra de controlo de cor
    const bar = [
      PROCESS.cyan,
      PROCESS.magenta,
      PROCESS.yellow,
      PROCESS.key,
      "#7fd1ef",
      "#f27fbf",
      "#fff27f",
      "#8a8990",
    ];
    bar.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(80 + i * 54, h - 92, 50, 32);
    });
    // Círculos CMYK sobrepostos (multiplicação de tintas)
    ctx.globalCompositeOperation = "multiply";
    const cx = w / 2;
    const cy = 560;
    const r = 230;
    [
      [PROCESS.cyan, cx - 120, cy - 60],
      [PROCESS.magenta, cx + 120, cy - 60],
      [PROCESS.yellow, cx, cy + 140],
    ].forEach(([color, x, y]) => {
      ctx.fillStyle = color as string;
      ctx.beginPath();
      ctx.arc(x as number, y as number, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = PROCESS.key;
    font(ctx, 800, 150, DISPLAY, "condensed");
    ctx.fillText("CMYK", 80, 1150);
    font(ctx, 500, 26, MONO);
    ctx.fillStyle = "#4a4751";
    ctx.fillText("PROVA DE COR · 300 DPI · SANGRIA 3 MM", 84, 1210);
    // Marcas de registo e de corte
    for (const [x, y] of [
      [w / 2, 40],
      [w / 2, h - 30],
    ]) {
      registrationMark(ctx, x, y, 18, PROCESS.key);
    }
    ctx.strokeStyle = PROCESS.key;
    ctx.lineWidth = 2;
    for (const [x, y, dx, dy] of [
      [60, 60, -1, -1],
      [w - 60, 60, 1, -1],
      [60, h - 140, -1, 1],
      [w - 60, h - 140, 1, 1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * 10);
      ctx.lineTo(x, y + dy * 46);
      ctx.moveTo(x + dx * 10, y);
      ctx.lineTo(x + dx * 46, y);
      ctx.stroke();
    }
  });
}
