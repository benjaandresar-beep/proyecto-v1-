"use client";

// Personaje low-poly 3D (niño/NPC/adulto). Arte provisional reemplazable.
// La guatita translúcida muestra la acumulación cualitativa de emociones
// (interocepción, 3.3): segmentos de color apilados, sin números visibles.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ChargeMap, CHARGE_MAX, DISPLACENTERAS, EMOTIONS, totalCharge } from "@/lib/emotions";
import { AvatarConfig } from "@/lib/storage";

interface Props {
  piel: string;
  pelo: AvatarConfig["pelo"] | "corto";
  colorPelo: string;
  polera: string;
  charge?: ChargeMap;
  /** tiembla suavemente cuando está abrumado */
  abrumado?: boolean;
  esAdulto?: boolean;
}

const BELLY_HEIGHT = 0.5; // alto interno disponible para los segmentos de carga

export default function CharacterMesh({
  piel,
  pelo,
  colorPelo,
  polera,
  charge = {},
  abrumado = false,
  esAdulto = false,
}: Props) {
  const grupo = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!grupo.current) return;
    const t = state.clock.elapsedTime;
    // respiración sutil siempre; temblor si está abrumado
    grupo.current.position.y = Math.sin(t * 2) * 0.02;
    grupo.current.rotation.z = abrumado ? Math.sin(t * 18) * 0.05 : 0;
  });

  // segmentos de carga apilados de abajo hacia arriba en la guatita
  let acumulado = 0;
  const segmentos = DISPLACENTERAS.flatMap((id) => {
    const v = charge[id] ?? 0;
    if (v <= 0) return [];
    const alto = (v / CHARGE_MAX) * BELLY_HEIGHT;
    const y = -BELLY_HEIGHT / 2 + acumulado + alto / 2;
    acumulado += alto;
    return [{ color: EMOTIONS[id].color, alto, y }];
  });

  const total = Math.min(totalCharge(charge), CHARGE_MAX);
  const escala = esAdulto ? 1.3 : 1;

  return (
    <group ref={grupo} scale={escala}>
      {/* piernas */}
      <mesh position={[-0.16, 0.3, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.6, 8]} />
        <meshStandardMaterial color="#3f5a78" flatShading />
      </mesh>
      <mesh position={[0.16, 0.3, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.6, 8]} />
        <meshStandardMaterial color="#3f5a78" flatShading />
      </mesh>

      {/* torso */}
      <mesh position={[0, 0.95, 0]}>
        <capsuleGeometry args={[0.34, 0.5, 4, 10]} />
        <meshStandardMaterial color={polera} flatShading />
      </mesh>

      {/* brazos */}
      <mesh position={[-0.44, 0.95, 0]} rotation={[0, 0, 0.25]}>
        <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
        <meshStandardMaterial color={polera} flatShading />
      </mesh>
      <mesh position={[0.44, 0.95, 0]} rotation={[0, 0, -0.25]}>
        <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
        <meshStandardMaterial color={polera} flatShading />
      </mesh>
      <mesh position={[-0.5, 0.68, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={piel} flatShading />
      </mesh>
      <mesh position={[0.5, 0.68, 0]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={piel} flatShading />
      </mesh>

      {/* guatita translúcida con la carga acumulada (3.3) */}
      <group position={[0, 0.88, 0.27]}>
        <mesh>
          <sphereGeometry args={[0.27, 12, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.35}
            emissive={total >= 75 ? "#e0503f" : "#000000"}
            emissiveIntensity={total >= 75 ? 0.35 : 0}
          />
        </mesh>
        {segmentos.map((s, i) => (
          <mesh key={i} position={[0, s.y, 0]}>
            <cylinderGeometry args={[0.18, 0.18, s.alto, 10]} />
            <meshStandardMaterial color={s.color} flatShading />
          </mesh>
        ))}
      </group>

      {/* cabeza */}
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.32, 14, 14]} />
        <meshStandardMaterial color={piel} flatShading />
      </mesh>
      {/* ojos */}
      <mesh position={[-0.11, 1.66, 0.27]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
      <mesh position={[0.11, 1.66, 0.27]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>

      {/* pelo según estilo */}
      {pelo === "corto" && (
        <mesh position={[0, 1.78, -0.02]}>
          <sphereGeometry args={[0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
          <meshStandardMaterial color={colorPelo} flatShading />
        </mesh>
      )}
      {pelo === "largo" && (
        <>
          <mesh position={[0, 1.78, -0.02]}>
            <sphereGeometry args={[0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={colorPelo} flatShading />
          </mesh>
          <mesh position={[0, 1.35, -0.22]}>
            <cylinderGeometry args={[0.26, 0.2, 0.7, 10]} />
            <meshStandardMaterial color={colorPelo} flatShading />
          </mesh>
        </>
      )}
      {pelo === "rizado" && (
        <group position={[0, 1.8, 0]}>
          {[
            [-0.18, 0.05, 0.1],
            [0.18, 0.05, 0.1],
            [0, 0.14, 0],
            [-0.2, 0, -0.14],
            [0.2, 0, -0.14],
            [0, 0.06, -0.22],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color={colorPelo} flatShading />
            </mesh>
          ))}
        </group>
      )}
      {pelo === "coleta" && (
        <>
          <mesh position={[0, 1.78, -0.02]}>
            <sphereGeometry args={[0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
            <meshStandardMaterial color={colorPelo} flatShading />
          </mesh>
          <mesh position={[0, 1.85, -0.3]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={colorPelo} flatShading />
          </mesh>
          <mesh position={[0, 1.6, -0.36]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.03, 0.5, 8]} />
            <meshStandardMaterial color={colorPelo} flatShading />
          </mesh>
        </>
      )}
    </group>
  );
}
