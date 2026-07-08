"use client";

// Personaje 3D estilo bloques (niño/NPC/adulto) con extremidades articuladas.
// Cuerpo, cabeza y extremidades son cajas con materiales lisos que proyectan
// sombra, al estilo de los juegos 3D infantiles tipo voxel.
// Animaciones: caminata (al desplazarse) y un arquetipo por tipo de ejercicio
// (salto, correr en el sitio, empujar, calma).
// La guatita translúcida muestra la acumulación cualitativa de emociones
// (interocepción, 3.3): segmentos de color apilados, sin números visibles.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ChargeMap, CHARGE_MAX, DISPLACENTERAS, EMOTIONS, totalCharge } from "@/lib/emotions";
import { ExerciseAnimation } from "@/lib/exercises";
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
  /** true mientras el personaje se desplaza por la sala */
  caminando?: boolean;
  /** animación del ejercicio en práctica; tiene prioridad sobre la caminata */
  ejercicio?: ExerciseAnimation | null;
  /** audífonos puestos (herramienta de la Calle que reduce el estímulo, 4.3) */
  audifonos?: boolean;
}

const BELLY_HEIGHT = 0.5; // alto interno disponible para los segmentos de carga
const BRAZO_BASE_I = 0.12; // inclinación de reposo de los brazos
const BRAZO_BASE_D = -0.12;
const PANTALON = "#3b82f6";
const OJOS = "#1f2937";

export default function CharacterMesh({
  piel,
  pelo,
  colorPelo,
  polera,
  charge = {},
  abrumado = false,
  esAdulto = false,
  caminando = false,
  ejercicio = null,
  audifonos = false,
}: Props) {
  const grupo = useRef<THREE.Group>(null);
  const piernaI = useRef<THREE.Group>(null);
  const piernaD = useRef<THREE.Group>(null);
  const brazoI = useRef<THREE.Group>(null);
  const brazoD = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = grupo.current;
    const pI = piernaI.current;
    const pD = piernaD.current;
    const bI = brazoI.current;
    const bD = brazoD.current;
    if (!g || !pI || !pD || !bI || !bD) return;

    const t = state.clock.elapsedTime;

    // objetivos de pose según el estado actual
    let alto = Math.sin(t * 2) * 0.02; // respiración sutil en reposo
    let inclinacion = 0;
    let balanceoZ = abrumado ? Math.sin(t * 18) * 0.05 : 0;
    let piernaIx = 0;
    let piernaDx = 0;
    let brazoIx = 0;
    let brazoDx = 0;
    let brazoIz = BRAZO_BASE_I;
    let brazoDz = BRAZO_BASE_D;

    if (ejercicio === "salto") {
      // saltos de estrella: el cuerpo sube y los brazos se abren hacia arriba
      const f = Math.abs(Math.sin(t * 5));
      alto = f * 0.45;
      brazoIz = BRAZO_BASE_I + f * 2.3;
      brazoDz = BRAZO_BASE_D - f * 2.3;
    } else if (ejercicio === "correr") {
      const f = Math.sin(t * 14);
      piernaIx = f * 0.95;
      piernaDx = -f * 0.95;
      brazoIx = -f * 0.85;
      brazoDx = f * 0.85;
      alto = Math.abs(Math.sin(t * 14)) * 0.06;
    } else if (ejercicio === "empujar") {
      // brazos al frente y cuerpo inclinado, con pequeño pulso de esfuerzo
      brazoIx = -1.35 + Math.sin(t * 6) * 0.08;
      brazoDx = -1.35 + Math.sin(t * 6) * 0.08;
      inclinacion = 0.28;
    } else if (ejercicio === "abrazo") {
      // abrazo de oso: brazos cruzados al pecho, con un pulso de apretón
      const s = (Math.sin(t * 1.8) + 1) / 2;
      brazoIx = -1.25;
      brazoDx = -1.25;
      brazoIz = -0.55 - s * 0.25; // cruzan hacia el lado contrario
      brazoDz = 0.55 + s * 0.25;
      inclinacion = 0.08 + s * 0.05;
    } else if (ejercicio === "balanceo") {
      // mecerse lento de un lado a otro
      balanceoZ = Math.sin(t * 2.1) * 0.18;
      alto = Math.abs(Math.sin(t * 2.1)) * 0.02;
    } else if (ejercicio === "marcha") {
      // marcha rítmica lenta: rodillas arriba, braceo parejo
      const f = Math.sin(t * 6);
      piernaIx = Math.max(f, 0) * 0.7;
      piernaDx = Math.max(-f, 0) * 0.7;
      brazoIx = -f * 0.45;
      brazoDx = f * 0.45;
      alto = Math.abs(Math.sin(t * 6)) * 0.05;
    } else if (ejercicio === "calma") {
      // respiración amplia y lenta: los brazos suben y bajan con el aire
      const s = (Math.sin(t * 1.7) + 1) / 2;
      brazoIz = BRAZO_BASE_I + s * 2.1;
      brazoDz = BRAZO_BASE_D - s * 2.1;
      alto = Math.sin(t * 1.7) * 0.07;
    } else if (caminando) {
      // ciclo de caminata marcado: zancada amplia, braceo opuesto,
      // rebote por paso y leve inclinación hacia adelante
      const f = Math.sin(t * 11);
      piernaIx = f * 0.8;
      piernaDx = -f * 0.8;
      brazoIx = -f * 0.6;
      brazoDx = f * 0.6;
      alto = Math.abs(Math.cos(t * 11)) * 0.06;
      inclinacion = 0.1;
    }

    // transición suave hacia la pose objetivo (alta velocidad de respuesta
    // para que la zancada no se atenúe)
    const k = 22;
    pI.rotation.x = THREE.MathUtils.damp(pI.rotation.x, piernaIx, k, delta);
    pD.rotation.x = THREE.MathUtils.damp(pD.rotation.x, piernaDx, k, delta);
    bI.rotation.x = THREE.MathUtils.damp(bI.rotation.x, brazoIx, k, delta);
    bD.rotation.x = THREE.MathUtils.damp(bD.rotation.x, brazoDx, k, delta);
    bI.rotation.z = THREE.MathUtils.damp(bI.rotation.z, brazoIz, k, delta);
    bD.rotation.z = THREE.MathUtils.damp(bD.rotation.z, brazoDz, k, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, alto, k, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, inclinacion, 10, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, balanceoZ, 8, delta);
  });

  // segmentos de carga apilados de abajo hacia arriba en la guatita
  let acumulado = 0;
  const segmentos = DISPLACENTERAS.flatMap((id) => {
    const v = charge[id] ?? 0;
    if (v <= 0) return [];
    const altoSeg = (v / CHARGE_MAX) * BELLY_HEIGHT;
    const y = -BELLY_HEIGHT / 2 + acumulado + altoSeg / 2;
    acumulado += altoSeg;
    return [{ color: EMOTIONS[id].color, alto: altoSeg, y }];
  });

  const total = Math.min(totalCharge(charge), CHARGE_MAX);
  const escala = esAdulto ? 1.3 : 1;

  return (
    <group ref={grupo} scale={escala}>
      {/* piernas articuladas en la cadera */}
      <group ref={piernaI} position={[-0.17, 0.62, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow>
          <boxGeometry args={[0.26, 0.62, 0.3]} />
          <meshStandardMaterial color={PANTALON} />
        </mesh>
      </group>
      <group ref={piernaD} position={[0.17, 0.62, 0]}>
        <mesh position={[0, -0.31, 0]} castShadow>
          <boxGeometry args={[0.26, 0.62, 0.3]} />
          <meshStandardMaterial color={PANTALON} />
        </mesh>
      </group>

      {/* torso */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.72, 0.92, 0.4]} />
        <meshStandardMaterial color={polera} />
      </mesh>

      {/* brazos articulados en el hombro */}
      <group ref={brazoI} position={[-0.47, 1.28, 0]} rotation={[0, 0, BRAZO_BASE_I]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.66, 0.22]} />
          <meshStandardMaterial color={polera} />
        </mesh>
        <mesh position={[0, -0.7, 0]} castShadow>
          <boxGeometry args={[0.18, 0.16, 0.2]} />
          <meshStandardMaterial color={piel} />
        </mesh>
      </group>
      <group ref={brazoD} position={[0.47, 1.28, 0]} rotation={[0, 0, BRAZO_BASE_D]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.66, 0.22]} />
          <meshStandardMaterial color={polera} />
        </mesh>
        <mesh position={[0, -0.7, 0]} castShadow>
          <boxGeometry args={[0.18, 0.16, 0.2]} />
          <meshStandardMaterial color={piel} />
        </mesh>
      </group>

      {/* guatita translúcida con la carga acumulada (3.3) */}
      <group position={[0, 0.88, 0.22]}>
        <mesh>
          <boxGeometry args={[0.5, 0.56, 0.16]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.35}
            emissive={total >= 75 ? "#ef4444" : "#000000"}
            emissiveIntensity={total >= 75 ? 0.35 : 0}
          />
        </mesh>
        {segmentos.map((s, i) => (
          <mesh key={i} position={[0, s.y, 0.005]}>
            <boxGeometry args={[0.4, s.alto, 0.1]} />
            <meshStandardMaterial color={s.color} />
          </mesh>
        ))}
      </group>

      {/* cabeza */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <boxGeometry args={[0.56, 0.56, 0.56]} />
        <meshStandardMaterial color={piel} />
      </mesh>
      {/* ojos */}
      <mesh position={[-0.12, 1.66, 0.29]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={OJOS} />
      </mesh>
      <mesh position={[0.12, 1.66, 0.29]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={OJOS} />
      </mesh>

      {/* audífonos: banda y orejeras en bloques */}
      {audifonos && (
        <group position={[0, 1.62, 0]}>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.68, 0.08, 0.12]} />
            <meshStandardMaterial color="#3c3c3c" />
          </mesh>
          <mesh position={[-0.33, 0.02, 0]}>
            <boxGeometry args={[0.1, 0.26, 0.26]} />
            <meshStandardMaterial color="#3c3c3c" />
          </mesh>
          <mesh position={[0.33, 0.02, 0]}>
            <boxGeometry args={[0.1, 0.26, 0.26]} />
            <meshStandardMaterial color="#3c3c3c" />
          </mesh>
        </group>
      )}

      {/* pelo según estilo (bloques) */}
      {pelo === "corto" && (
        <mesh position={[0, 1.93, -0.02]} castShadow>
          <boxGeometry args={[0.6, 0.16, 0.6]} />
          <meshStandardMaterial color={colorPelo} />
        </mesh>
      )}
      {pelo === "largo" && (
        <>
          <mesh position={[0, 1.93, -0.02]} castShadow>
            <boxGeometry args={[0.6, 0.16, 0.6]} />
            <meshStandardMaterial color={colorPelo} />
          </mesh>
          <mesh position={[0, 1.52, -0.31]} castShadow>
            <boxGeometry args={[0.6, 0.72, 0.14]} />
            <meshStandardMaterial color={colorPelo} />
          </mesh>
        </>
      )}
      {pelo === "rizado" && (
        <mesh position={[0, 1.96, -0.02]} castShadow>
          <boxGeometry args={[0.7, 0.34, 0.7]} />
          <meshStandardMaterial color={colorPelo} />
        </mesh>
      )}
      {pelo === "coleta" && (
        <>
          <mesh position={[0, 1.93, -0.02]} castShadow>
            <boxGeometry args={[0.6, 0.16, 0.6]} />
            <meshStandardMaterial color={colorPelo} />
          </mesh>
          <mesh position={[0, 1.94, -0.34]} castShadow>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial color={colorPelo} />
          </mesh>
          <mesh position={[0, 1.6, -0.38]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.13, 0.55, 0.13]} />
            <meshStandardMaterial color={colorPelo} />
          </mesh>
        </>
      )}
    </group>
  );
}
