"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, ContactShadows, Environment, Lightformer, PresentationControls } from "@react-three/drei";
import {
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  NeutralToneMapping,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  type Group,
  type Texture,
} from "three";
import type { Tier } from "./capability";
import * as art from "./textures";

/**
 * Pré-visualização do configurador: um só objeto a rodar devagar, que se pode arrastar.
 * Medidas em metros; o <Bounds> enquadra a câmara em qualquer tamanho (cartão de 8,5 cm ou lona de 6 m).
 * Com um PNG/JPG do cliente, a arte dele vai para a face impressa.
 */
export type PreviewKind = "card" | "flat" | "rollup" | "banner" | "box";

export type ProductPreviewProps = {
  kind: PreviewKind;
  tier: Exclude<Tier, "none">;
  /** Tamanho da arte em cm (largura × altura) */
  sizeCm: { width: number; height: number };
  /** Altura da caixa em cm (só "box") */
  depthCm?: number;
  artworkUrl: string | null;
  onReady?: () => void;
};

/** Textura a partir do ficheiro do cliente; liberta a anterior quando muda. */
function useArtwork(url: string | null) {
  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let current: Texture | null = null;
    new TextureLoader().load(url, (loaded) => {
      loaded.colorSpace = SRGBColorSpace;
      loaded.anisotropy = 8;
      current = loaded;
      setTexture(loaded);
    });
    return () => {
      current?.dispose();
      setTexture(null);
    };
  }, [url]);
  return url ? texture : null;
}

/** Textura desenhada em canvas (fábrica estável + argumento simples), libertada quando muda ou sai de cena. */
function useCanvasTexture<A>(create: (arg: A) => Texture, arg: A) {
  const texture = useMemo(() => create(arg), [create, arg]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const paper = (map?: Texture | null) =>
  new MeshStandardMaterial({ color: map ? "#ffffff" : "#f7f4ee", map: map ?? null, roughness: 0.82 });
const metal = new MeshStandardMaterial({ color: "#c9ccd1", metalness: 0.85, roughness: 0.3 });
const edge = new MeshStandardMaterial({ color: "#f4f1ea", roughness: 0.9 });

function Spin({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.35;
  });
  return <group ref={ref}>{children}</group>;
}

/** Placa fina com frente impressa e verso liso (cartão, flyer, vinil, lona). */
function Plate({
  width,
  height,
  depth,
  front,
  back,
}: {
  width: number;
  height: number;
  depth: number;
  front: Texture | null;
  back: Texture | null;
}) {
  const [geometry] = useState(() => new BoxGeometry(1, 1, 1));
  useEffect(() => () => geometry.dispose(), [geometry]);
  // Ordem das faces da BoxGeometry: +x, −x, +y, −y, +z (frente), −z (verso)
  const materials = useMemo(() => [edge, edge, edge, edge, paper(front), paper(back)], [front, back]);
  useEffect(() => () => materials.slice(4).forEach((m) => m.dispose()), [materials]);
  return <mesh geometry={geometry} material={materials} scale={[width, height, depth]} castShadow />;
}

function Card({ artwork }: { artwork: Texture | null }) {
  const front = useCanvasTexture(art.endjuCardFront, undefined);
  const back = useCanvasTexture(art.endjuCardBack, undefined);
  return (
    <group position={[0, 0.0275 + 0.01, 0]}>
      <Plate width={0.085} height={0.055} depth={0.0006} front={artwork ?? front} back={back} />
    </group>
  );
}

function Flat({ artwork, w, h }: { artwork: Texture | null; w: number; h: number }) {
  const sample = useCanvasTexture(art.pressSheet, undefined);
  return (
    <group position={[0, h / 2 + h * 0.04, 0]}>
      <Plate width={w} height={h} depth={Math.max(w, h) * 0.003} front={artwork ?? sample} back={null} />
    </group>
  );
}

function Banner({ artwork, w, h }: { artwork: Texture | null; w: number; h: number }) {
  const sample = useCanvasTexture(art.endjuBanner, Math.round((w / h) * 100) / 100);
  // Ilhós a cada 50 cm, a 3 cm da borda (no máximo 80 para lonas muito grandes)
  const rings: [number, number][] = [];
  const along = (length: number) => Math.max(2, Math.round(length / 0.5) + 1);
  const nx = along(w);
  const ny = along(h);
  for (let i = 0; i < nx; i++) {
    const x = -w / 2 + 0.03 + ((w - 0.06) * i) / (nx - 1);
    rings.push([x, h / 2 - 0.03], [x, -h / 2 + 0.03]);
  }
  for (let j = 1; j < ny - 1; j++) {
    const y = -h / 2 + 0.03 + ((h - 0.06) * j) / (ny - 1);
    rings.push([-w / 2 + 0.03, y], [w / 2 - 0.03, y]);
  }
  const [ring] = useState(() => new TorusGeometry(0.012, 0.004, 8, 20));
  useEffect(() => () => ring.dispose(), [ring]);
  return (
    <group position={[0, h / 2 + 0.05, 0]}>
      <Plate width={w} height={h} depth={0.003} front={artwork ?? sample} back={null} />
      {rings.slice(0, 80).map(([x, y]) => (
        <mesh key={`${x}-${y}`} geometry={ring} material={metal} position={[x, y, 0.002]} />
      ))}
    </group>
  );
}

function Rollup({ artwork, w, h }: { artwork: Texture | null; w: number; h: number }) {
  const sample = useCanvasTexture(art.endjuBanner, Math.round((w / h) * 100) / 100);
  const [bar] = useState(() => new CylinderGeometry(0.012, 0.012, 1, 16));
  useEffect(() => () => bar.dispose(), [bar]);
  return (
    <group>
      {/* Base em alumínio com o rolo lá dentro */}
      <mesh material={metal} position={[0, 0.045, 0]} castShadow>
        <boxGeometry args={[w + 0.04, 0.09, 0.16]} />
      </mesh>
      <group position={[0, 0.09 + h / 2, 0]}>
        <Plate width={w} height={h} depth={0.002} front={artwork ?? sample} back={null} />
      </group>
      <mesh
        geometry={bar}
        material={metal}
        position={[0, 0.09 + h, 0]}
        rotation-z={Math.PI / 2}
        scale={[1, w + 0.02, 1]}
      />
      <mesh geometry={bar} material={metal} position={[0, 0.09 + h / 2, -0.03]} scale={[0.6, h, 0.6]} />
    </group>
  );
}

function MailerBox({ artwork, w, d, h }: { artwork: Texture | null; w: number; d: number; h: number }) {
  const lid = useCanvasTexture(art.kraftBoxPrint, undefined);
  const kraft = useCanvasTexture(art.kraftPlain, undefined);
  const [geometry] = useState(() => new BoxGeometry(1, 1, 1));
  useEffect(() => () => geometry.dispose(), [geometry]);
  const materials = useMemo(() => {
    const side = new MeshStandardMaterial({ color: kraft ? "#ffffff" : "#b98b5e", map: kraft, roughness: 0.9 });
    const top = new MeshStandardMaterial({ color: "#ffffff", map: artwork ?? lid, roughness: 0.85 });
    return [side, side, top, side, side, side];
  }, [kraft, artwork, lid]);
  useEffect(() => () => new Set(materials).forEach((m) => m.dispose()), [materials]);
  // +y é a tampa impressa
  return (
    <group position={[0, h / 2, 0]} rotation-x={0.35}>
      <mesh geometry={geometry} material={materials} scale={[w, h, d]} castShadow />
    </group>
  );
}

function Scene({ kind, sizeCm, depthCm = 8, artworkUrl, onReady }: Omit<ProductPreviewProps, "tier">) {
  const [assets, setAssets] = useState(false);
  const artwork = useArtwork(artworkUrl);
  useEffect(() => {
    let alive = true;
    void art.loadTextureAssets().then(() => {
      if (!alive) return;
      setAssets(true);
      onReady?.();
    });
    return () => {
      alive = false;
    };
  }, [onReady]);
  if (!assets) return null;

  const w = sizeCm.width / 100;
  const h = sizeCm.height / 100;
  const span = kind === "card" ? 0.1 : Math.max(w, h, depthCm / 100);
  return (
    <>
      {/* A sombra acompanha o tamanho do objeto (um cartão e uma lona de 6 m precisam de escalas diferentes) */}
      <ContactShadows position={[0, 0, 0]} scale={span * 3} blur={2.2} far={span * 2} opacity={0.35} frames={1} />
      {/* A Bounds remonta quando o objeto muda de forma, para voltar a enquadrar */}
      <Bounds key={`${kind}-${w}-${h}`} fit clip margin={1.3}>
        <PresentationControls global={false} cursor speed={1.4} polar={[-0.35, 0.35]} azimuth={[-Infinity, Infinity]}>
          <Spin>
            {kind === "card" && <Card artwork={artwork} />}
            {kind === "flat" && <Flat artwork={artwork} w={w} h={h} />}
            {kind === "banner" && <Banner artwork={artwork} w={w} h={h} />}
            {kind === "rollup" && <Rollup artwork={artwork} w={w} h={h} />}
            {kind === "box" && <MailerBox artwork={artwork} w={w} d={h} h={depthCm / 100} />}
          </Spin>
        </PresentationControls>
      </Bounds>
    </>
  );
}

export default function ProductPreview({ tier, ...props }: ProductPreviewProps) {
  const high = tier === "high";
  return (
    <Canvas
      shadows={false}
      dpr={high ? [1, 2] : 1}
      camera={{ fov: 32, position: [0, 0.6, 3] }}
      gl={{ antialias: high, toneMapping: NeutralToneMapping, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 4]} intensity={2} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#d9ecff" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 2]} scale={[8, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1} position={[-4, 2, 3]} scale={[3, 3, 1]} rotation-y={Math.PI / 3} />
      </Environment>
      <Scene {...props} />
    </Canvas>
  );
}
