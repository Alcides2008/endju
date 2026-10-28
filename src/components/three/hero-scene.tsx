"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { CatmullRomCurve3, NeutralToneMapping, Vector3, type PerspectiveCamera } from "three";
import type { Tier } from "./capability";
import { dwell } from "./dwell";
import { BannerRoll, BusinessCards, PackagingBox, PaperSheet, SwatchFan } from "./print-objects";
import { loadTextureAssets, pressSheet } from "./textures";

export type HeroSceneProps = {
  tier: Exclude<Tier, "none">;
  /** Progresso do scroll no hero (0–1), escrito pelo ScrollTrigger sem re-render. */
  progress: { current: number };
  /** Pausa o render quando o hero sai do ecrã. */
  active: boolean;
  onReady: () => void;
  /** A cena leve não aguenta a fluidez mínima: o hero troca para a ilustração estática. */
  onTooSlow: () => void;
};

// Paragens da câmara, uma por capítulo: visão geral → cartões → leque de cores → lona e caixa
const STOPS = {
  position: [
    // Visão geral centrada no leque, na lona e na caixa: os cartões ficam por trás do texto e aparecem depois
    new Vector3(3.0, 3.9, 10.5),
    new Vector3(-2.3, 1.55, 2.7),
    new Vector3(1.4, 1.7, 4.6),
    new Vector3(6.2, 2.8, 6.0),
  ],
  target: [
    new Vector3(2.6, 0.5, 0),
    new Vector3(-3.1, 0.15, 0.25),
    new Vector3(0, 0.95, -0.3),
    new Vector3(5.1, 0.3, 0.3),
  ],
};

/** Posição do rato (desktop) ou inclinação do telemóvel (giroscópio), normalizada em −1…1. */
function usePointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current.x = (event.clientX / innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / innerHeight) * 2 - 1;
    };
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      pointer.current.x = clamp(event.gamma / 25);
      pointer.current.y = clamp((event.beta - 45) / 25);
    };
    // iOS só dá o giroscópio depois de um toque e de autorização explícita
    const askPermission = () => {
      const request = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission;
      request?.().catch(() => {});
    };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("deviceorientation", onTilt, { passive: true });
    addEventListener("touchend", askPermission, { once: true });
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("deviceorientation", onTilt);
      removeEventListener("touchend", askPermission);
    };
  }, []);
  return pointer;
}

function CameraRig({ progress }: { progress: { current: number } }) {
  const pointer = usePointer();
  // A câmara e os vetores de trabalho são objetos three.js mutáveis por natureza: vivem em refs/getter
  const get = useThree((state) => state.get);
  const size = useThree((state) => state.size);
  const curves = useMemo(
    () => ({
      position: new CatmullRomCurve3(STOPS.position, false, "centripetal"),
      target: new CatmullRomCurve3(STOPS.target, false, "centripetal"),
    }),
    [],
  );
  const goal = useRef({ position: new Vector3(), target: new Vector3(), look: STOPS.target[0].clone() });

  // Desktop: o texto fica à esquerda, por isso a cena desloca-se para a direita.
  // Telemóvel: o texto fica em baixo, a cena sobe.
  useEffect(() => {
    const camera = get().camera as PerspectiveCamera;
    const landscape = size.width >= size.height;
    camera.setViewOffset(
      size.width,
      size.height,
      landscape ? -size.width * 0.16 : 0,
      landscape ? 0 : size.height * 0.14,
      size.width,
      size.height,
    );
    camera.fov = landscape ? 32 : 46;
    camera.updateProjectionMatrix();
    return () => camera.clearViewOffset();
  }, [get, size]);

  useFrame(({ camera, size: viewport }, delta) => {
    const { position, target, look } = goal.current;
    const t = dwell(progress.current, STOPS.position.length);
    curves.position.getPoint(t, position);
    curves.target.getPoint(t, target);
    // Em retrato cabe menos na largura: a câmara recua, sobretudo na visão geral inicial
    if (viewport.width < viewport.height) {
      position
        .sub(target)
        .multiplyScalar(1.15 + 0.45 * Math.max(0, 1 - t * 3))
        .add(target);
    }
    position.x += pointer.current.x * 0.35;
    position.y -= pointer.current.y * 0.2;
    const ease = 1 - Math.exp(-delta * 3.5); // amortecimento independente da taxa de fotogramas
    camera.position.lerp(position, ease);
    look.lerp(target, ease);
    camera.lookAt(look);
  });
  return null;
}

function Lights({ high }: { high: boolean }) {
  return (
    <>
      <hemisphereLight intensity={0.65} color="#fffaf0" groundColor="#d8cfbf" />
      <directionalLight
        position={[3.5, 8, 6]}
        intensity={2.3}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-radius={5}
      >
        <orthographicCamera attach="shadow-camera" args={[-9, 9, 6, -6, 0.5, 30]} />
      </directionalLight>
      <directionalLight position={[-6, 3, -4]} intensity={0.55} color="#d9ecff" />
      {/* Reflexos para o metal e o vinil, sem descarregar HDR */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 2]} scale={[10, 4, 1]} rotation-x={Math.PI / 2} />
        <Lightformer
          form="rect"
          intensity={1.1}
          position={[-5, 2, 3]}
          scale={[4, 6, 1]}
          rotation-y={Math.PI / 3}
          color="#ffe9d6"
        />
        <Lightformer form="ring" intensity={1.4} position={[5, 3, 2]} scale={2} color="#ffd1ea" />
      </Environment>
    </>
  );
}

function Ground({ high }: { high: boolean }) {
  // Chão invisível: só recebe a sombra, por isso funciona nos temas claro e escuro.
  // No nível leve a sombra é "fotografada" uma vez: por isso o Ground monta depois dos objetos.
  return high ? (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <shadowMaterial transparent opacity={0.13} />
    </mesh>
  ) : (
    <ContactShadows
      position={[1.4, 0.001, 0]}
      scale={16}
      blur={2.4}
      far={3}
      opacity={0.35}
      resolution={512}
      frames={2}
    />
  );
}

/**
 * Mede os fps reais entre o 2.º e o 7.º segundo depois de a cena aparecer (sem a compilação dos shaders).
 * Abaixo do mínimo, a cena dá lugar à ilustração estática: um 3D aos solavancos é pior do que nenhum.
 */
function FpsGuard({ minFps, onTooSlow }: { minFps: number; onTooSlow: () => void }) {
  const stats = useRef({ elapsed: 0, frames: 0, done: false });
  useFrame((_, delta) => {
    const s = stats.current;
    if (s.done) return;
    s.elapsed += Math.min(delta, 0.5); // separador em segundo plano não conta como lentidão
    if (s.elapsed < 2) return;
    s.frames += 1;
    if (s.elapsed >= 7) {
      s.done = true;
      if (s.frames / (s.elapsed - 2) < minFps) onTooSlow();
    }
  });
  return null;
}

function Workshop({ high, onReady, onTooSlow }: { high: boolean; onReady: () => void; onTooSlow: () => void }) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadTextureAssets()
      .catch(() => {})
      .finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Dois fotogramas depois de montar os objetos: shaders compilados, o loader pode sair
  useEffect(() => {
    if (!fontsReady) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [fontsReady, onReady]);

  if (!fontsReady) return null;
  return (
    <>
      <BusinessCards position={[-3.2, 0, 0.2]} rotation={[0, 0.25, 0]} />
      <SwatchFan position={[0, 0, -0.3]} />
      <BannerRoll position={[3.6, 0, -0.7]} rotation={[0, -0.12, 0]} />
      <PackagingBox position={[5.9, 0, 0.6]} rotation={[0, -0.5, 0]} animate={high} />
      <PaperSheet print={pressSheet} position={[-1.4, 2.3, -1.2]} rotation={[-0.3, 0.4, 0.15]} />
      {high && (
        <>
          <PaperSheet position={[2.2, 2.8, -1.8]} rotation={[-0.5, -0.5, -0.2]} phase={1.7} />
          <PaperSheet print={pressSheet} position={[5.2, 2.5, -0.9]} rotation={[-0.2, -0.8, 0.1]} phase={3.1} />
        </>
      )}
      <Ground high={high} />
      <FpsGuard minFps={high ? 0 : 12} onTooSlow={onTooSlow} />
    </>
  );
}

export default function HeroScene({ tier, progress, active, onReady, onTooSlow }: HeroSceneProps) {
  const high = tier === "high";
  const [dpr, setDpr] = useState(high ? 1.75 : 1);

  return (
    <Canvas
      shadows={high ? "percentage" : false} // PCF com raio: o PCFSoft foi removido do three.js
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: high, alpha: true, powerPreference: "high-performance", toneMapping: NeutralToneMapping }}
      camera={{ fov: 32, near: 0.1, far: 60, position: STOPS.position[0].toArray() }}
      aria-hidden
    >
      {/* Se os fotogramas caírem, baixa a resolução antes de perder fluidez */}
      <PerformanceMonitor bounds={() => [24, 55]} onDecline={() => setDpr(high ? 1 : 0.75)} />
      <CameraRig progress={progress} />
      <Lights high={high} />
      <Workshop high={high} onReady={onReady} onTooSlow={onTooSlow} />
    </Canvas>
  );
}
