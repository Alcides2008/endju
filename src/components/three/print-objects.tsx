"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import {
  BackSide,
  BoxGeometry,
  CylinderGeometry,
  FrontSide,
  MeshStandardMaterial,
  PlaneGeometry,
  type BufferAttribute,
  type Group,
  type Material,
  type Texture,
} from "three";
import * as art from "./textures";

type Vec3 = [number, number, number];
type Placement = { position?: Vec3; rotation?: Vec3; animate?: boolean };

/** Liberta geometrias, materiais e texturas criados fora do JSX quando o objeto sai de cena. */
function useDisposable<T extends object>(create: () => T): T {
  const [value] = useState(create); // criado uma vez por montagem
  useEffect(
    () => () => {
      const seen = new Set<unknown>();
      const dispose = (item: unknown) => {
        if (!item || typeof item !== "object" || seen.has(item)) return;
        seen.add(item);
        if (Array.isArray(item)) return item.forEach(dispose);
        const material = item as Material & { map?: Texture; metalnessMap?: Texture; roughnessMap?: Texture };
        dispose(material.map);
        dispose(material.metalnessMap);
        dispose(material.roughnessMap);
        if ("dispose" in item && typeof item.dispose === "function") item.dispose();
        else Object.values(item).forEach(dispose);
      };
      dispose(value);
    },
    [value],
  );
  return value;
}

// ── Folha de papel que se dobra ao meio ─────────────────────────────────────

const SHEET_W = 1.05;
const SHEET_H = 1.485; // proporção A4

/** Dobra a metade direita sobre a esquerda, com vinco arredondado, e acrescenta uma ondulação leve. */
function bend(geometry: PlaneGeometry, base: Float32Array, angle: number, time: number) {
  const position = geometry.attributes.position as BufferAttribute;
  const crease = 0.1;
  const radius = crease / Math.max(angle, 1e-4);
  for (let i = 0; i < position.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    let px = x;
    let pz = 0.012 * Math.sin(y * 2.2 + time * 1.3);
    if (x > 0 && angle > 1e-3) {
      if (x <= crease) {
        const theta = (x / crease) * angle;
        px = radius * Math.sin(theta);
        pz += radius * (1 - Math.cos(theta));
      } else {
        const rest = x - crease;
        px = radius * Math.sin(angle) + rest * Math.cos(angle);
        pz += radius * (1 - Math.cos(angle)) + rest * Math.sin(angle);
      }
    }
    position.setXYZ(i, px, y, pz);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function PaperSheet({
  print,
  phase = 0,
  position,
  rotation,
  animate = true,
}: Placement & { print?: () => Texture; phase?: number }) {
  const res = useDisposable(() => {
    const geometry = new PlaneGeometry(SHEET_W, SHEET_H, 48, 6);
    return {
      geometry,
      base: Float32Array.from(geometry.attributes.position.array),
      front: new MeshStandardMaterial({ map: print?.() ?? null, color: "#fbfaf6", roughness: 0.92, side: FrontSide }),
      back: new MeshStandardMaterial({ color: "#f3efe6", roughness: 0.95, side: BackSide }),
    };
  });

  // Posição inicial já dobrada (também é o estado fixo quando não há animação)
  useEffect(() => bend(res.geometry, res.base, 0.9 + phase * 0.2, phase), [res, phase]);

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime * 0.45 + phase;
    bend(res.geometry, res.base, Math.max(0, Math.sin(t)) ** 2 * 2.6, t);
  });

  return (
    <Float speed={animate ? 1.2 : 0} rotationIntensity={0.4} floatIntensity={0.6}>
      <group position={position} rotation={rotation}>
        <mesh geometry={res.geometry} material={res.front} castShadow />
        <mesh geometry={res.geometry} material={res.back} castShadow />
      </group>
    </Float>
  );
}

// ── Cartões de visita ──────────────────────────────────────────────────────

const CARD: Vec3 = [0.85, 0.55, 0.01];
// Ordem das faces de uma BoxGeometry: +x, −x, +y, −y, +z (frente), −z (verso)
const faces = (edge: Material, front: Material, back: Material) => [edge, edge, edge, edge, front, back];

export function BusinessCards({ position, rotation, animate = true }: Placement) {
  const res = useDisposable(() => {
    const geometry = new BoxGeometry(...CARD);
    const edge = new MeshStandardMaterial({ color: "#efebe2", roughness: 0.9 });
    const front = new MeshStandardMaterial({ map: art.endjuCardFront(), roughness: 0.62 }); // laminação soft-touch
    const back = new MeshStandardMaterial({ map: art.endjuCardBack(), roughness: 0.55 });
    const foil = art.foilCard();
    const foilFront = new MeshStandardMaterial({
      map: foil.map,
      metalnessMap: foil.metalnessMap,
      roughnessMap: foil.roughnessMap,
      metalness: 1,
      roughness: 1,
    });
    const black = new MeshStandardMaterial({ color: "#141317", roughness: 0.85 });
    const kraftEdge = new MeshStandardMaterial({ color: "#b48d62", roughness: 0.95 });
    const kraft = new MeshStandardMaterial({ map: art.kraftCardFront(), roughness: 0.95 });
    return {
      geometry,
      endju: faces(edge, front, back),
      endjuFlipped: faces(edge, back, front),
      foil: faces(black, foilFront, black),
      kraft: faces(kraftEdge, kraft, kraftEdge),
    };
  });

  const stack = [0.02, -0.04, 0.05, -0.015, 0.03];
  return (
    <group position={position} rotation={rotation}>
      {stack.map((turn, i) => (
        <mesh
          key={i}
          geometry={res.geometry}
          material={res.endju}
          position={[0, 0.006 + i * 0.0105, 0]}
          rotation={[-Math.PI / 2, 0, turn]}
          castShadow
          receiveShadow
        />
      ))}
      <mesh
        geometry={res.geometry}
        material={res.foil}
        position={[0.78, 0.006, 0.28]}
        rotation={[-Math.PI / 2, 0, -0.38]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={res.geometry}
        material={res.kraft}
        position={[-0.74, 0.006, 0.36]}
        rotation={[-Math.PI / 2, 0, 0.42]}
        castShadow
        receiveShadow
      />
      {/* Um cartão solta-se do monte e roda no ar, a mostrar frente e verso */}
      <Float speed={animate ? 1.6 : 0} rotationIntensity={animate ? 1.4 : 0} floatIntensity={0.5}>
        <mesh
          geometry={res.geometry}
          material={res.endjuFlipped}
          position={[0.12, 0.62, 0.05]}
          rotation={[-0.9, 0.35, 0.2]}
          castShadow
        />
      </Float>
    </group>
  );
}

// ── Leque de cores CMYK / Pantone ──────────────────────────────────────────

const SWATCHES: [string, string, string][] = [
  [art.PROCESS.cyan, "PROCESS CYAN", "C100 M0 Y0 K0"],
  [art.PROCESS.magenta, "PROCESS MAGENTA", "C0 M100 Y0 K0"],
  [art.PROCESS.yellow, "PROCESS YELLOW", "C0 M0 Y100 K0"],
  [art.PROCESS.key, "PROCESS BLACK", "C0 M0 Y0 K100"],
  ["#f08000", "ENDJU LARANJA", "C0 M60 Y100 K0"],
  ["#00a651", "ENDJU VERDE", "C85 M0 Y100 K0"],
  ["#6d2077", "ENDJU ROXO", "C65 M100 Y10 K10"],
  ["#e0301a", "ENDJU VERMELHO", "C0 M90 Y95 K0"],
];
const STRIP: Vec3 = [0.45, 2.1, 0.006];
const PIVOT = 0.12; // distância do eixo à base da tira

export function SwatchFan({ position, rotation, animate = true }: Placement) {
  const fan = useRef<Group>(null);
  const strips = useRef<(Group | null)[]>([]);
  const res = useDisposable(() => {
    const edge = new MeshStandardMaterial({ color: "#ece7dc", roughness: 0.9 });
    return {
      strip: new BoxGeometry(...STRIP),
      pin: new CylinderGeometry(0.04, 0.04, 0.09, 32),
      metal: new MeshStandardMaterial({ color: "#c7cad0", metalness: 1, roughness: 0.22 }),
      strips: SWATCHES.map(([color, label, code]) => {
        const face = new MeshStandardMaterial({ map: art.swatchStrip(color, label, code), roughness: 0.7 });
        return faces(edge, face, face);
      }),
    };
  });

  const spread = (open: number, i: number) => (i - (SWATCHES.length - 1) / 2) * (0.07 + open * 0.13);

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime;
    const open = 0.5 + 0.5 * Math.sin(t * 0.7);
    strips.current.forEach((strip, i) => strip && (strip.rotation.z = spread(open, i)));
    if (fan.current) fan.current.rotation.y = Math.sin(t * 0.3) * 0.35;
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={fan} position={[0, PIVOT + 0.05, 0]}>
        {res.strips.map((materials, i) => (
          <group key={i} ref={(node) => void (strips.current[i] = node)} rotation={[0, 0, spread(0.6, i)]}>
            <mesh
              geometry={res.strip}
              material={materials}
              position={[0, STRIP[1] / 2 - PIVOT, i * 0.008 - 0.03]}
              castShadow
              receiveShadow
            />
          </group>
        ))}
        <mesh geometry={res.pin} material={res.metal} rotation={[Math.PI / 2, 0, 0]} castShadow />
      </group>
    </group>
  );
}

// ── Rolo de lona com a impressão desenrolada ───────────────────────────────

const ROLL_L = 2.2;
const ROLL_R = 0.17;

export function BannerRoll({ position, rotation }: Placement) {
  const res = useDisposable(() => ({
    roll: new CylinderGeometry(ROLL_R, ROLL_R, ROLL_L, 64),
    core: new CylinderGeometry(0.07, 0.07, ROLL_L + 0.05, 32),
    sheet: new PlaneGeometry(ROLL_L, 1.8),
    vinyl: new MeshStandardMaterial({ map: art.bannerBack(), roughness: 0.45 }),
    printed: new MeshStandardMaterial({ map: art.galaBanner(), roughness: 0.5 }),
    cardboard: new MeshStandardMaterial({ color: "#a47c52", roughness: 0.95 }),
  }));

  return (
    <group position={position} rotation={rotation}>
      <mesh
        geometry={res.roll}
        material={res.vinyl}
        position={[0, ROLL_R, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={res.core}
        material={res.cardboard}
        position={[0, ROLL_R, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      />
      <mesh
        geometry={res.sheet}
        material={res.printed}
        position={[0, 0.003, 0.92]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />
    </group>
  );
}

// ── Caixa kraft personalizada, de tampa a abrir ────────────────────────────

const BOX = { w: 1.1, h: 0.55, d: 0.8, t: 0.02 };

function Wall({ size, position, material }: { size: Vec3; position: Vec3; material: Material | Material[] }) {
  const geometry = useDisposable(() => new BoxGeometry(...size));
  return <mesh geometry={geometry} material={material} position={position} castShadow receiveShadow />;
}

export function PackagingBox({ position, rotation, animate = true }: Placement) {
  const lid = useRef<Group>(null);
  const res = useDisposable(() => {
    const plain = new MeshStandardMaterial({ map: art.kraftPlain(), roughness: 0.95 });
    const inner = new MeshStandardMaterial({ color: "#d8bd98", roughness: 0.95 });
    const printed = new MeshStandardMaterial({ map: art.kraftBoxPrint(), roughness: 0.92 });
    return {
      plain,
      inner,
      front: [plain, plain, plain, plain, printed, inner],
      lidTop: [plain, plain, printed, inner, plain, plain],
    };
  });

  useFrame(({ clock }) => {
    if (animate && lid.current) lid.current.rotation.x = -(1.7 + 0.2 * Math.sin(clock.elapsedTime * 0.6));
  });

  const { w, h, d, t } = BOX;
  return (
    <group position={position} rotation={rotation}>
      <Wall size={[w, t, d]} position={[0, t / 2, 0]} material={res.inner} />
      <Wall size={[w, h, t]} position={[0, h / 2, d / 2 - t / 2]} material={res.front} />
      <Wall size={[w, h, t]} position={[0, h / 2, -d / 2 + t / 2]} material={res.plain} />
      <Wall size={[t, h, d]} position={[-w / 2 + t / 2, h / 2, 0]} material={res.plain} />
      <Wall size={[t, h, d]} position={[w / 2 - t / 2, h / 2, 0]} material={res.plain} />
      {/* Tampa articulada na aresta de trás */}
      <group ref={lid} position={[0, h, -d / 2]} rotation={[-1.75, 0, 0]}>
        <Wall size={[w + 0.02, t, d + 0.02]} position={[0, t / 2, (d + 0.02) / 2]} material={res.lidTop} />
      </group>
    </group>
  );
}
