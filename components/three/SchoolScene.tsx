"use client";

// Escena 3D de la sala de clases (low-poly). Solo renderiza el mundo:
// el estado del juego (carga, burbujas, diálogos) vive en SchoolGame3D.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import { ChargeMap, EmotionId, EMOTIONS } from "@/lib/emotions";
import { ExerciseAnimation } from "@/lib/exercises";
import { AvatarConfig } from "@/lib/storage";

export interface Npc3D {
  id: string;
  nombre: string;
  piel: string;
  pelo: AvatarConfig["pelo"];
  colorPelo: string;
  polera: string;
  pos: [number, number]; // x, z en el piso
  esAdulto?: boolean;
}

export interface Orbe {
  key: number;
  color: string;
  desde: [number, number, number];
}

interface SceneProps {
  avatar: AvatarConfig;
  charge: ChargeMap;
  abrumado: boolean;
  npcs: Npc3D[];
  burbujas: Record<string, EmotionId | undefined>;
  objetivo: [number, number];
  orbe: Orbe | null;
  /** compresión horizontal de la sala en pantallas angostas (1 = escritorio) */
  escalaX: number;
  /** animación del ejercicio que el personaje está practicando */
  animacionEjercicio: ExerciseAnimation | null;
  onSuelo: (x: number, z: number) => void;
  onNpc: (id: string) => void;
  onOrbeLlega: () => void;
  /** se dispara cuando el personaje termina de caminar hasta su destino */
  onLlegada: () => void;
}

const DIST_BASE = 11.6; // distancia de cámara en escritorio

// Ajusta la cámara para que todo el contenido de la sala quepa en cualquier
// proporción de pantalla (celular vertical, tablet, escritorio).
function CameraRig({
  escalaX,
  onDistancia,
}: {
  escalaX: number;
  onDistancia: (d: number) => void;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const vFov = THREE.MathUtils.degToRad(persp.fov);
    // medio ancho del contenido a encuadrar (sala comprimida + margen)
    const mitadContenido = 7.0 * escalaX + 0.8;
    const distPorAncho = mitadContenido / (Math.tan(vFov / 2) * aspect);
    const d = Math.max(DIST_BASE, distPorAncho);
    const objetivo = new THREE.Vector3(0, 0.8, 0.4);
    const direccion = new THREE.Vector3(0, 6, 9.8).normalize();
    persp.position.copy(objetivo.clone().add(direccion.multiplyScalar(d)));
    persp.lookAt(objetivo);
    persp.updateProjectionMatrix();
    onDistancia(d);
  }, [camera, size, escalaX, onDistancia]);

  return null;
}

function Jugador({
  avatar,
  charge,
  abrumado,
  objetivo,
  animacionEjercicio,
  jugadorRef,
  onLlegada,
}: {
  avatar: AvatarConfig;
  charge: ChargeMap;
  abrumado: boolean;
  objetivo: [number, number];
  animacionEjercicio: ExerciseAnimation | null;
  jugadorRef: React.RefObject<THREE.Group | null>;
  onLlegada: () => void;
}) {
  // estado de caminata para activar el ciclo de animación
  const [caminando, setCaminando] = useState(false);
  const caminandoRef = useRef(false);
  // hay una llegada pendiente de notificar cada vez que cambia el destino
  const llegadaPendiente = useRef(false);
  const ultimoObjetivo = useRef(objetivo);
  if (objetivo !== ultimoObjetivo.current) {
    ultimoObjetivo.current = objetivo;
    llegadaPendiente.current = true;
  }

  const VELOCIDAD = 2.6; // unidades por segundo, constante como en un videojuego

  useFrame((_, delta) => {
    const g = jugadorRef.current;
    if (!g) return;
    const dx = objetivo[0] - g.position.x;
    const dz = objetivo[1] - g.position.z;
    const dist = Math.hypot(dx, dz);
    let enMovimiento = false;

    if (dist > 0.05) {
      enMovimiento = true;
      // avanza a velocidad constante hacia el punto tocado (sin patinar)
      const paso = Math.min(VELOCIDAD * delta, dist);
      g.position.x += (dx / dist) * paso;
      g.position.z += (dz / dist) * paso;
      // gira con suavidad hacia la dirección de marcha (camino angular corto)
      const anguloObjetivo = Math.atan2(dx, dz);
      let giro = anguloObjetivo - g.rotation.y;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      g.rotation.y += giro * Math.min(10 * delta, 1);
    } else {
      if (llegadaPendiente.current) {
        llegadaPendiente.current = false;
        onLlegada();
      }
      if (!animacionEjercicio) {
        // al detenerse vuelve a mirar de frente, despacio
        let giro = -g.rotation.y;
        giro = Math.atan2(Math.sin(giro), Math.cos(giro));
        g.rotation.y += giro * Math.min(3 * delta, 1);
      }
    }

    if (enMovimiento !== caminandoRef.current) {
      caminandoRef.current = enMovimiento;
      setCaminando(enMovimiento);
    }
  });

  return (
    <group ref={jugadorRef} position={[objetivo[0], 0, objetivo[1]]}>
      <CharacterMesh
        piel={avatar.piel}
        pelo={avatar.pelo}
        colorPelo={avatar.colorPelo}
        polera={avatar.polera}
        charge={charge}
        abrumado={abrumado}
        caminando={caminando}
        ejercicio={animacionEjercicio}
      />
      {abrumado && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 24]} />
          <meshBasicMaterial color="#e0503f" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function OrbeViajero({
  orbe,
  jugadorRef,
  onLlega,
}: {
  orbe: Orbe;
  jugadorRef: React.RefObject<THREE.Group | null>;
  onLlega: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const progreso = useRef(0);
  const llego = useRef(false);

  useFrame((_, delta) => {
    if (!ref.current || llego.current) return;
    progreso.current = Math.min(progreso.current + delta / 1.1, 1);
    const t = progreso.current;
    const destino = jugadorRef.current
      ? jugadorRef.current.position.clone().add(new THREE.Vector3(0, 0.9, 0.3))
      : new THREE.Vector3(0, 0.9, 0);
    const origen = new THREE.Vector3(...orbe.desde);
    const pos = origen.lerp(destino, t);
    pos.y += Math.sin(t * Math.PI) * 0.8; // arco suave
    ref.current.position.copy(pos);
    if (t >= 1) {
      llego.current = true;
      onLlega();
    }
  });

  return (
    <mesh ref={ref} position={orbe.desde}>
      <sphereGeometry args={[0.13, 10, 10]} />
      <meshStandardMaterial color={orbe.color} emissive={orbe.color} emissiveIntensity={0.7} />
    </mesh>
  );
}

function Sala({
  escalaX,
  onSuelo,
}: {
  escalaX: number;
  onSuelo: (x: number, z: number) => void;
}) {
  const limiteX = 6.2 * escalaX;

  function clickPiso(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSuelo(
      THREE.MathUtils.clamp(e.point.x, -limiteX, limiteX),
      THREE.MathUtils.clamp(e.point.z, -3.6, 4.4)
    );
  }

  return (
    <group>
      {/* piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={clickPiso} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#dcc89f" />
      </mesh>
      {/* muro trasero */}
      <mesh position={[0, 2.2, -5]}>
        <planeGeometry args={[14, 4.4]} />
        <meshStandardMaterial color="#bfe3f2" />
      </mesh>
      {/* muros laterales */}
      <mesh position={[-7, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#cdeaf6" />
      </mesh>
      <mesh position={[7, 2.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#cdeaf6" />
      </mesh>
      {/* pizarra */}
      <mesh position={[-2.2 * escalaX, 2.2, -4.93]}>
        <boxGeometry args={[3.6 * escalaX, 1.8, 0.08]} />
        <meshStandardMaterial color="#3f7d5a" />
      </mesh>
      <mesh position={[-2.2 * escalaX, 2.2, -4.97]}>
        <boxGeometry args={[3.9 * escalaX, 2.1, 0.04]} />
        <meshStandardMaterial color="#8a6240" />
      </mesh>
      {/* ventanas */}
      {[1.8, 4.4].map((x) => (
        <mesh key={x} position={[x * escalaX, 2.4, -4.95]}>
          <boxGeometry args={[1.6 * escalaX, 1.3, 0.06]} />
          <meshStandardMaterial color="#f3fbff" emissive="#dff2ff" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* mesas */}
      {([[-3.5, 0.5], [0, -0.5], [3.5, 0.5], [-1.8, 2.2], [2, 2.4]] as [number, number][]).map(
        ([x, z], i) => (
          <group key={i} position={[x * escalaX, 0, z]}>
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[1.3, 0.08, 0.8]} />
              <meshStandardMaterial color="#c89b6a" flatShading />
            </mesh>
            {([[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]] as [number, number][]).map(
              ([px, pz], j) => (
                <mesh key={j} position={[px, 0.27, pz]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.54, 6]} />
                  <meshStandardMaterial color="#9a7448" flatShading />
                </mesh>
              )
            )}
          </group>
        )
      )}
    </group>
  );
}

export default function SchoolScene({
  avatar,
  charge,
  abrumado,
  npcs,
  burbujas,
  objetivo,
  orbe,
  escalaX,
  animacionEjercicio,
  onSuelo,
  onNpc,
  onOrbeLlega,
  onLlegada,
}: SceneProps) {
  const jugadorRef = useRef<THREE.Group | null>(null);
  // las etiquetas y burbujas mantienen tamaño legible aunque la cámara se aleje
  const [factorEtiqueta, setFactorEtiqueta] = useState(10);

  return (
    <Canvas
      camera={{ position: [0, 6.8, 9.8], fov: 48 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <CameraRig
        escalaX={escalaX}
        onDistancia={(d) => setFactorEtiqueta(10 * (d / DIST_BASE))}
      />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} />

      <Sala escalaX={escalaX} onSuelo={onSuelo} />

      {npcs.map((npc) => {
        const emocion = burbujas[npc.id];
        return (
          <group
            key={npc.id}
            position={[npc.pos[0], 0, npc.pos[1]]}
            onPointerDown={(e) => {
              e.stopPropagation();
              onNpc(npc.id);
            }}
          >
            <CharacterMesh
              piel={npc.piel}
              pelo={npc.pelo}
              colorPelo={npc.colorPelo}
              polera={npc.polera}
              esAdulto={npc.esAdulto}
            />
            <Html
              position={[0, npc.esAdulto ? 3.1 : 2.5, 0]}
              center
              distanceFactor={factorEtiqueta}
              style={{ pointerEvents: "none", textAlign: "center" }}
            >
              {emocion && (
                <div
                  className="burbuja"
                  style={{ background: EMOTIONS[emocion].color, margin: "0 auto 4px" }}
                />
              )}
              <div className="npc-nombre">{npc.nombre}</div>
            </Html>
          </group>
        );
      })}

      <Jugador
        avatar={avatar}
        charge={charge}
        abrumado={abrumado}
        objetivo={objetivo}
        animacionEjercicio={animacionEjercicio}
        jugadorRef={jugadorRef}
        onLlegada={onLlegada}
      />

      {orbe && <OrbeViajero orbe={orbe} jugadorRef={jugadorRef} onLlega={onOrbeLlega} />}
    </Canvas>
  );
}
