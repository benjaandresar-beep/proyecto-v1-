"use client";

// Escena 3D de la casa explorable. Renderiza el área actual (living, patio,
// pasillos, habitaciones) con sus puertas animadas, mascotas y muebles.
// El estado del juego y la navegación viven en CasaGame3D.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import { ChargeMap, EmotionId, EMOTIONS } from "@/lib/emotions";
import { ExerciseAnimation } from "@/lib/exercises";
import { AvatarConfig } from "@/lib/storage";
import { AreaDef, CasaArea, PuertaDef } from "@/lib/casa";

export interface Npc3D {
  id: string;
  nombre: string;
  piel: string;
  pelo: AvatarConfig["pelo"];
  colorPelo: string;
  polera: string;
  pos: [number, number];
  esAdulto?: boolean;
}

export interface Orbe {
  key: number;
  color: string;
  desde: [number, number, number];
}

interface SceneProps {
  area: AreaDef;
  avatar: AvatarConfig;
  charge: ChargeMap;
  abrumado: boolean;
  animacionEjercicio: ExerciseAnimation | null;
  audifonos: boolean;
  /** familia con burbujas (solo en el living) */
  npcs: Npc3D[];
  burbujas: Record<string, EmotionId | undefined>;
  objetivo: [number, number];
  orbe: Orbe | null;
  mostrarEtiquetas: boolean;
  /** id de la puerta que se está abriendo (para animarla) */
  puertaAbriendo: string | null;
  /** comida servida al perro */
  perroAlimentado: boolean;
  onSuelo: (x: number, z: number) => void;
  onNpc: (id: string) => void;
  onPuerta: (p: PuertaDef) => void;
  onMascota: (cual: "perro" | "gato") => void;
  onObjeto: (cual: "audifonos") => void;
  onOrbeLlega: () => void;
  onLlegada: () => void;
}

const DIST_BASE = 11.6;

function CameraRig({ onDistancia }: { onDistancia: (d: number) => void }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const vFov = THREE.MathUtils.degToRad(persp.fov);
    const distPorAncho = 7.4 / (Math.tan(vFov / 2) * aspect);
    const d = Math.max(DIST_BASE, distPorAncho);
    const objetivo = new THREE.Vector3(0, 0.8, 0.2);
    const direccion = new THREE.Vector3(0, 6, 9.8).normalize();
    persp.position.copy(objetivo.clone().add(direccion.multiplyScalar(d)));
    persp.lookAt(objetivo);
    persp.updateProjectionMatrix();
    onDistancia(d);
  }, [camera, size, onDistancia]);
  return null;
}

// ---------- jugador ----------

function Jugador({
  avatar,
  charge,
  abrumado,
  objetivo,
  animacionEjercicio,
  audifonos,
  jugadorRef,
  onLlegada,
}: {
  avatar: AvatarConfig;
  charge: ChargeMap;
  abrumado: boolean;
  objetivo: [number, number];
  animacionEjercicio: ExerciseAnimation | null;
  audifonos: boolean;
  jugadorRef: React.RefObject<THREE.Group | null>;
  onLlegada: () => void;
}) {
  const [caminando, setCaminando] = useState(false);
  const caminandoRef = useRef(false);
  const llegadaPendiente = useRef(false);
  const ultimoObjetivo = useRef(objetivo);
  if (objetivo !== ultimoObjetivo.current) {
    ultimoObjetivo.current = objetivo;
    llegadaPendiente.current = true;
  }
  const VEL = 2.8;

  useFrame((_, delta) => {
    const g = jugadorRef.current;
    if (!g) return;
    const dx = objetivo[0] - g.position.x;
    const dz = objetivo[1] - g.position.z;
    const dist = Math.hypot(dx, dz);
    let mov = false;
    if (dist > 0.05) {
      mov = true;
      const paso = Math.min(VEL * delta, dist);
      g.position.x += (dx / dist) * paso;
      g.position.z += (dz / dist) * paso;
      let giro = Math.atan2(dx, dz) - g.rotation.y;
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      g.rotation.y += giro * Math.min(10 * delta, 1);
    } else {
      if (llegadaPendiente.current) {
        llegadaPendiente.current = false;
        onLlegada();
      }
      if (!animacionEjercicio) {
        let giro = -g.rotation.y;
        giro = Math.atan2(Math.sin(giro), Math.cos(giro));
        g.rotation.y += giro * Math.min(3 * delta, 1);
      }
    }
    if (mov !== caminandoRef.current) {
      caminandoRef.current = mov;
      setCaminando(mov);
    }
  });

  const posInicial = useRef<[number, number, number]>([objetivo[0], 0, objetivo[1]]);
  return (
    <group ref={jugadorRef} position={posInicial.current}>
      <CharacterMesh
        piel={avatar.piel}
        pelo={avatar.pelo}
        colorPelo={avatar.colorPelo}
        polera={avatar.polera}
        charge={charge}
        abrumado={abrumado}
        caminando={caminando}
        ejercicio={animacionEjercicio}
        audifonos={audifonos}
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

// ---------- NPC familia ----------

function NpcFamilia({
  npc,
  emocion,
  factorEtiqueta,
  mostrar,
  onNpc,
}: {
  npc: Npc3D;
  emocion: EmotionId | undefined;
  factorEtiqueta: number;
  mostrar: boolean;
  onNpc: (id: string) => void;
}) {
  return (
    <group
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
      {mostrar && (
        <Html
          position={[0, npc.esAdulto ? 3.1 : 2.5, 0]}
          center
          distanceFactor={factorEtiqueta}
          zIndexRange={[12, 0]}
          style={{ pointerEvents: "none", textAlign: "center" }}
        >
          {emocion && (
            <div className="burbuja" style={{ background: EMOTIONS[emocion].color, margin: "0 auto 4px" }} />
          )}
          <div className="npc-nombre">{npc.nombre}</div>
        </Html>
      )}
    </group>
  );
}

// ---------- orbe a la guatita ----------

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
    const pos = new THREE.Vector3(...orbe.desde).lerp(destino, t);
    pos.y += Math.sin(t * Math.PI) * 0.8;
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

// ---------- puerta animada ----------

function Puerta3D({
  puerta,
  abriendo,
  onPuerta,
}: {
  puerta: PuertaDef;
  abriendo: boolean;
  onPuerta: (p: PuertaDef) => void;
}) {
  const panel = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!panel.current) return;
    const objetivo = abriendo ? -Math.PI * 0.62 : 0;
    panel.current.rotation.y = THREE.MathUtils.damp(panel.current.rotation.y, objetivo, 7, delta);
  });
  return (
    <group
      position={[puerta.pos[0], 0, puerta.pos[1]]}
      rotation={[0, puerta.rotY, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPuerta(puerta);
      }}
    >
      {/* marco */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.5, 2.2, 0.22]} />
        <meshStandardMaterial color="#8a6240" flatShading />
      </mesh>
      {/* hueco oscuro detrás */}
      <mesh position={[0, 1.05, -0.02]}>
        <boxGeometry args={[1.15, 1.95, 0.05]} />
        <meshStandardMaterial color="#2b2417" />
      </mesh>
      {/* panel que pivota desde la jamba izquierda */}
      <group ref={panel} position={[-0.57, 0, 0.1]}>
        <mesh position={[0.57, 1.05, 0]}>
          <boxGeometry args={[1.08, 1.92, 0.09]} />
          <meshStandardMaterial color="#b9824e" flatShading />
        </mesh>
        <mesh position={[1.0, 1.05, 0.08]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#f2c24b" metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- mascotas (patio) ----------

function Perro({
  pos,
  alimentado,
  onTap,
}: {
  pos: [number, number];
  alimentado: boolean;
  onTap: () => void;
}) {
  const grupo = useRef<THREE.Group>(null);
  const cola = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (grupo.current) {
      // si está comiendo, baja la cabeza; si no, rebote feliz
      const lean = alimentado ? 0.5 : 0;
      grupo.current.rotation.x = THREE.MathUtils.damp(grupo.current.rotation.x, lean, 5, delta);
      grupo.current.position.y = alimentado ? 0 : Math.abs(Math.sin(t * 3)) * 0.06;
    }
    if (cola.current) cola.current.rotation.y = Math.sin(t * (alimentado ? 16 : 8)) * 0.6;
  });
  return (
    <group
      position={[pos[0], 0, pos[1]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <group ref={grupo}>
        {/* cuerpo */}
        <mesh position={[0, 0.45, 0]}>
          <capsuleGeometry args={[0.28, 0.5, 4, 8]} />
          <meshStandardMaterial color="#b98a52" flatShading />
        </mesh>
        {/* patas */}
        {([[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]] as [number, number][]).map(
          ([x, z], i) => (
            <mesh key={i} position={[x, 0.12, z]}>
              <cylinderGeometry args={[0.07, 0.07, 0.24, 6]} />
              <meshStandardMaterial color="#9c7242" flatShading />
            </mesh>
          )
        )}
        {/* cabeza */}
        <mesh position={[0, 0.62, 0.42]}>
          <sphereGeometry args={[0.26, 10, 10]} />
          <meshStandardMaterial color="#b98a52" flatShading />
        </mesh>
        {/* hocico */}
        <mesh position={[0, 0.55, 0.66]}>
          <boxGeometry args={[0.16, 0.14, 0.16]} />
          <meshStandardMaterial color="#7a5a32" flatShading />
        </mesh>
        {/* orejas */}
        <mesh position={[-0.18, 0.82, 0.42]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.1, 0.22, 0.06]} />
          <meshStandardMaterial color="#9c7242" flatShading />
        </mesh>
        <mesh position={[0.18, 0.82, 0.42]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.1, 0.22, 0.06]} />
          <meshStandardMaterial color="#9c7242" flatShading />
        </mesh>
        {/* ojos */}
        <mesh position={[-0.1, 0.66, 0.62]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
        <mesh position={[0.1, 0.66, 0.62]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
        {/* cola */}
        <group ref={cola} position={[0, 0.55, -0.4]}>
          <mesh position={[0, 0.1, -0.12]} rotation={[-0.6, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.03, 0.4, 6]} />
            <meshStandardMaterial color="#b98a52" flatShading />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Gato({ pos, onTap }: { pos: [number, number]; onTap: () => void }) {
  const cola = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (cola.current) cola.current.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.4 - 0.4;
  });
  return (
    <group
      position={[pos[0], 0, pos[1]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <mesh position={[0, 0.3, 0]}>
        <capsuleGeometry args={[0.18, 0.34, 4, 8]} />
        <meshStandardMaterial color="#8a8a8a" flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0.26]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#8a8a8a" flatShading />
      </mesh>
      <mesh position={[-0.1, 0.66, 0.24]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.06, 0.14, 4]} />
        <meshStandardMaterial color="#8a8a8a" flatShading />
      </mesh>
      <mesh position={[0.1, 0.66, 0.24]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.06, 0.14, 4]} />
        <meshStandardMaterial color="#8a8a8a" flatShading />
      </mesh>
      <mesh position={[-0.07, 0.52, 0.42]}>
        <sphereGeometry args={[0.028, 6, 6]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
      <mesh position={[0.07, 0.52, 0.42]}>
        <sphereGeometry args={[0.028, 6, 6]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
      <group ref={cola} position={[0, 0.34, -0.28]}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.04, 0.03, 0.42, 6]} />
          <meshStandardMaterial color="#8a8a8a" flatShading />
        </mesh>
      </group>
    </group>
  );
}

function Tazon({ pos, color, lleno }: { pos: [number, number]; color: string; lleno: boolean }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.12, 12]} />
        <meshStandardMaterial color="#5a8fb0" flatShading />
      </mesh>
      {lleno && (
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 12]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      )}
    </group>
  );
}

function CasitaPerro({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.3, 1, 1.2]} />
        <meshStandardMaterial color="#a3673e" flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.05, 0.6, 4]} />
        <meshStandardMaterial color="#7a4a2a" flatShading />
      </mesh>
      {/* entrada */}
      <mesh position={[0, 0.4, 0.61]}>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#2b2417" />
      </mesh>
    </group>
  );
}

// ---------- muebles / objetos ----------

function Sofa({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[2.4, 0.6, 1]} />
        <meshStandardMaterial color="#c97b63" flatShading />
      </mesh>
      <mesh position={[0, 0.8, -0.42]}>
        <boxGeometry args={[2.4, 0.7, 0.22]} />
        <meshStandardMaterial color="#b86a52" flatShading />
      </mesh>
    </group>
  );
}

function Tv({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.6, 0.7, 0.45]} />
        <meshStandardMaterial color="#9a7448" flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[1.4, 0.85, 0.1]} />
        <meshStandardMaterial color="#2f2f2f" emissive="#4a6e8a" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Cama({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.5, 0.4, 2.2]} />
        <meshStandardMaterial color="#9a7448" flatShading />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.45, 0.2, 2.1]} />
        <meshStandardMaterial color="#cfe3f0" flatShading />
      </mesh>
      <mesh position={[0, 0.62, -0.85]}>
        <boxGeometry args={[1.2, 0.22, 0.4]} />
        <meshStandardMaterial color="#ffffff" flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0.5]}>
        <boxGeometry args={[1.45, 0.16, 1.1]} />
        <meshStandardMaterial color="#7fb0d6" flatShading />
      </mesh>
    </group>
  );
}

function Closet({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.3, 1.8, 0.6]} />
        <meshStandardMaterial color="#a37b52" flatShading />
      </mesh>
      <mesh position={[-0.32, 0.9, 0.31]}>
        <boxGeometry args={[0.58, 1.7, 0.04]} />
        <meshStandardMaterial color="#8a6240" flatShading />
      </mesh>
      <mesh position={[0.32, 0.9, 0.31]}>
        <boxGeometry args={[0.58, 1.7, 0.04]} />
        <meshStandardMaterial color="#8a6240" flatShading />
      </mesh>
    </group>
  );
}

function Planta({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.26, 0.32, 0.5, 10]} />
        <meshStandardMaterial color="#c97b63" flatShading />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.5, 10, 10]} />
        <meshStandardMaterial color="#6fae7d" flatShading />
      </mesh>
      <mesh position={[0.18, 1.1, 0.05]}>
        <sphereGeometry args={[0.32, 10, 10]} />
        <meshStandardMaterial color="#7cbf8a" flatShading />
      </mesh>
    </group>
  );
}

function AudifonosObjeto({
  pos,
  onTap,
}: {
  pos: [number, number];
  onTap: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = 0.9 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });
  return (
    <group
      position={[pos[0], 0, pos[1]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      {/* velador */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.7, 0.8, 0.7]} />
        <meshStandardMaterial color="#a37b52" flatShading />
      </mesh>
      {/* audífonos flotando con brillo */}
      <group ref={ref} position={[0, 0.9, 0]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.22, 0.04, 8, 18, Math.PI]} />
          <meshStandardMaterial color="#3c3c3c" />
        </mesh>
        <mesh position={[-0.22, -0.05, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#4a9fd6" emissive="#4a9fd6" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.22, -0.05, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#4a9fd6" emissive="#4a9fd6" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- shell de cada área (piso + muros o reja) ----------

function Shell({ area }: { area: AreaDef }) {
  if (area.id === "patio") {
    return (
      <group>
        {/* pasto */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[16, 12]} />
          <meshStandardMaterial color={area.piso} />
        </mesh>
        {/* reja del fondo y lados */}
        {[-5, 5].map((x) => (
          <mesh key={x} position={[x, 1, -4.6]}>
            <boxGeometry args={[0.16, 2, 0.16]} />
            <meshStandardMaterial color="#cfcfcf" flatShading />
          </mesh>
        ))}
        <mesh position={[0, 1.6, -4.7]}>
          <boxGeometry args={[12, 0.12, 0.12]} />
          <meshStandardMaterial color="#cfcfcf" flatShading />
        </mesh>
        {Array.from({ length: 13 }, (_, i) => -6 + i).map((x) => (
          <mesh key={x} position={[x, 1, -4.7]}>
            <boxGeometry args={[0.08, 2, 0.08]} />
            <meshStandardMaterial color="#dcdcdc" flatShading />
          </mesh>
        ))}
        {/* muro de la casa (donde está la puerta de volver) */}
        <mesh position={[0, 2, 4.9]}>
          <boxGeometry args={[16, 4, 0.3]} />
          <meshStandardMaterial color="#efd9b0" />
        </mesh>
      </group>
    );
  }

  // habitaciones / pasillos: piso + 3 muros
  const muroColor = "#efd9b0";
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color={area.piso} />
      </mesh>
      <mesh position={[0, 2.2, -5]}>
        <planeGeometry args={[14, 4.4]} />
        <meshStandardMaterial color={muroColor} />
      </mesh>
      <mesh position={[-7, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#e7cda0" />
      </mesh>
      <mesh position={[7, 2.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#e7cda0" />
      </mesh>
      {/* alfombra de pasillo para diferenciarlos */}
      {(area.id === "pasillo-der" || area.id === "pasillo-izq") && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 8]} />
          <meshStandardMaterial color="#b98a6a" />
        </mesh>
      )}
    </group>
  );
}

// ---------- muebles por área ----------

function MueblesArea({ area, onObjeto }: { area: AreaDef; onObjeto: (c: "audifonos") => void }) {
  switch (area.id) {
    case "principal":
      return (
        <group>
          <Sofa x={-3.6} z={1.5} />
          <Tv x={3.6} z={1.8} />
          <mesh position={[0, 0.01, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2, 24]} />
            <meshStandardMaterial color="#e8a4a4" />
          </mesh>
        </group>
      );
    case "patio":
      return (
        <group>
          <CasitaPerro pos={[-3.4, -2.2]} />
        </group>
      );
    case "pasillo-izq":
      return <Planta x={4.6} z={-3.8} />;
    case "tu-habitacion":
      return (
        <group>
          <Cama x={-3.4} z={-1} />
          <Closet x={4.4} z={-3.4} />
          {/* ropa en una silla */}
          <mesh position={[2, 0.5, 1.6]}>
            <boxGeometry args={[0.7, 0.1, 0.7]} />
            <meshStandardMaterial color="#7fb0d6" flatShading />
          </mesh>
          <AudifonosObjeto pos={[-3.4, 1.4]} onTap={() => onObjeto("audifonos")} />
        </group>
      );
    default:
      // habitaciones vacías: solo una ventana en el muro del fondo
      return (
        <mesh position={[2.6, 2.5, -4.93]}>
          <boxGeometry args={[1.6, 1.2, 0.06]} />
          <meshStandardMaterial color="#dff2ff" emissive="#dff2ff" emissiveIntensity={0.4} />
        </mesh>
      );
  }
}

// ---------- escena ----------

const FONDO_AREA: Record<CasaArea, string> = {
  principal: "#f3e3c3",
  patio: "#bfe8f5",
  "pasillo-der": "#efe0c4",
  "hab-der-arriba": "#efe0c4",
  "hab-der-abajo": "#efe0c4",
  "pasillo-izq": "#efe0c4",
  "tu-habitacion": "#e7ddf0",
};

export default function CasaScene({
  area,
  avatar,
  charge,
  abrumado,
  animacionEjercicio,
  audifonos,
  npcs,
  burbujas,
  objetivo,
  orbe,
  mostrarEtiquetas,
  puertaAbriendo,
  perroAlimentado,
  onSuelo,
  onNpc,
  onPuerta,
  onMascota,
  onObjeto,
  onOrbeLlega,
  onLlegada,
}: SceneProps) {
  const jugadorRef = useRef<THREE.Group | null>(null);
  const [factorEtiqueta, setFactorEtiqueta] = useState(10);

  function clickPiso(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSuelo(
      THREE.MathUtils.clamp(e.point.x, -6, 6),
      THREE.MathUtils.clamp(e.point.z, -3, 4.2)
    );
  }

  return (
    <Canvas camera={{ position: [0, 6.8, 9.8], fov: 48 }} style={{ position: "absolute", inset: 0 }}>
      <CameraRig onDistancia={(d) => setFactorEtiqueta(10 * (d / DIST_BASE))} />
      <ambientLight intensity={area.id === "patio" ? 1 : 0.82} />
      <directionalLight position={[5, 9, 4]} intensity={1.1} />

      {/* color de fondo del cielo/ambiente */}
      <color attach="background" args={[FONDO_AREA[area.id]]} />

      <Shell area={area} />
      {/* superficie invisible para capturar clicks de caminar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onPointerDown={clickPiso}>
        <planeGeometry args={[14, 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <MueblesArea area={area} onObjeto={onObjeto} />

      {/* puertas del área */}
      {area.puertas.map((p) => (
        <Puerta3D key={p.id} puerta={p} abriendo={puertaAbriendo === p.id} onPuerta={onPuerta} />
      ))}

      {/* familia (solo living) */}
      {npcs.map((npc) => (
        <NpcFamilia
          key={npc.id}
          npc={npc}
          emocion={burbujas[npc.id]}
          factorEtiqueta={factorEtiqueta}
          mostrar={mostrarEtiquetas}
          onNpc={onNpc}
        />
      ))}

      {/* mascotas y comida (patio) */}
      {area.id === "patio" && (
        <>
          <Perro pos={[-1.4, -1]} alimentado={perroAlimentado} onTap={() => onMascota("perro")} />
          <Gato pos={[2.4, -0.4]} onTap={() => onMascota("gato")} />
          <Tazon pos={[-2.4, 0.2]} color="#b5793f" lleno={perroAlimentado} />
          <Tazon pos={[-1.7, 0.4]} color="#4a9fd6" lleno />
          {mostrarEtiquetas && (
            <Html position={[-1.4, 2, -1]} center distanceFactor={factorEtiqueta} zIndexRange={[12, 0]}
              style={{ pointerEvents: "none", textAlign: "center" }}>
              <div className="npc-nombre">🐶 Firulais</div>
            </Html>
          )}
        </>
      )}

      <Jugador
        key={area.id}
        avatar={avatar}
        charge={charge}
        abrumado={abrumado}
        objetivo={objetivo}
        animacionEjercicio={animacionEjercicio}
        audifonos={audifonos}
        jugadorRef={jugadorRef}
        onLlegada={onLlegada}
      />

      {orbe && <OrbeViajero orbe={orbe} jugadorRef={jugadorRef} onLlega={onOrbeLlega} />}
    </Canvas>
  );
}
