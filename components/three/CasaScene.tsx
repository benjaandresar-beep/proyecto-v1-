"use client";

// Escena 3D de la casa explorable. Renderiza el área actual (living, patio,
// pasillos, habitaciones) con sus puertas animadas, mascotas y muebles.
// El patio está de fiesta: asado con parrilla humeante, mesa con comida,
// banderines y globos; los invitados llegan como NPC desde CasaGame3D.
// El estado del juego y la navegación viven en CasaGame3D.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import AutoSombras from "./AutoSombras";
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
  /** personajes con burbujas (familia en el living, invitados del asado en el patio) */
  npcs: Npc3D[];
  burbujas: Record<string, EmotionId | undefined>;
  objetivo: [number, number];
  orbe: Orbe | null;
  mostrarEtiquetas: boolean;
  /** id de la puerta que se está abriendo (para animarla) */
  puertaAbriendo: string | null;
  /** comida servida al perro */
  perroAlimentado: boolean;
  /** comida servida al gato */
  gatoAlimentado: boolean;
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
      {emocion && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.75, 0.07, 10, 28]} />
          <meshStandardMaterial
            color={EMOTIONS[emocion].color}
            emissive={EMOTIONS[emocion].color}
            emissiveIntensity={0.55}
          />
        </mesh>
      )}
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
        <meshStandardMaterial color="#8a6240" />
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
          <meshStandardMaterial color="#b9824e" />
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
          <meshStandardMaterial color="#b98a52" />
        </mesh>
        {/* patas */}
        {([[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]] as [number, number][]).map(
          ([x, z], i) => (
            <mesh key={i} position={[x, 0.12, z]}>
              <cylinderGeometry args={[0.07, 0.07, 0.24, 6]} />
              <meshStandardMaterial color="#9c7242" />
            </mesh>
          )
        )}
        {/* cabeza */}
        <mesh position={[0, 0.62, 0.42]}>
          <sphereGeometry args={[0.26, 10, 10]} />
          <meshStandardMaterial color="#b98a52" />
        </mesh>
        {/* hocico */}
        <mesh position={[0, 0.55, 0.66]}>
          <boxGeometry args={[0.16, 0.14, 0.16]} />
          <meshStandardMaterial color="#7a5a32" />
        </mesh>
        {/* orejas */}
        <mesh position={[-0.18, 0.82, 0.42]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.1, 0.22, 0.06]} />
          <meshStandardMaterial color="#9c7242" />
        </mesh>
        <mesh position={[0.18, 0.82, 0.42]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.1, 0.22, 0.06]} />
          <meshStandardMaterial color="#9c7242" />
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
            <meshStandardMaterial color="#b98a52" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Gato({
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
    // si comió, baja la cabeza hacia el tazón; si no, cola tranquila
    if (grupo.current) {
      grupo.current.rotation.x = THREE.MathUtils.damp(grupo.current.rotation.x, alimentado ? 0.45 : 0, 5, delta);
    }
    if (cola.current) cola.current.rotation.x = Math.sin(t * (alimentado ? 6 : 2)) * 0.4 - 0.4;
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
      <mesh position={[0, 0.3, 0]}>
        <capsuleGeometry args={[0.18, 0.34, 4, 8]} />
        <meshStandardMaterial color="#8a8a8a" />
      </mesh>
      <mesh position={[0, 0.5, 0.26]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#8a8a8a" />
      </mesh>
      <mesh position={[-0.1, 0.66, 0.24]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.06, 0.14, 4]} />
        <meshStandardMaterial color="#8a8a8a" />
      </mesh>
      <mesh position={[0.1, 0.66, 0.24]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.06, 0.14, 4]} />
        <meshStandardMaterial color="#8a8a8a" />
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
          <meshStandardMaterial color="#8a8a8a" />
        </mesh>
      </group>
      </group>
    </group>
  );
}

function Tazon({ pos, color, lleno }: { pos: [number, number]; color: string; lleno: boolean }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.12, 12]} />
        <meshStandardMaterial color="#5a8fb0" />
      </mesh>
      {lleno && (
        <mesh position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 12]} />
          <meshStandardMaterial color={color} />
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
        <meshStandardMaterial color="#a3673e" />
      </mesh>
      <mesh position={[0, 1.15, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.05, 0.6, 4]} />
        <meshStandardMaterial color="#7a4a2a" />
      </mesh>
      {/* entrada */}
      <mesh position={[0, 0.4, 0.61]}>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#2b2417" />
      </mesh>
    </group>
  );
}

// ---------- fiesta en el patio (asado) ----------

function Parrilla({ pos }: { pos: [number, number] }) {
  const humo = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!humo.current) return;
    humo.current.children.forEach((m, i) => {
      const t = (state.clock.elapsedTime * 0.35 + i / 3) % 1;
      m.position.set(Math.sin((t + i) * 5) * 0.15, 1.05 + t * 1.7, 0);
      m.scale.setScalar(0.14 + t * 0.26);
      const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = 0.55 * (1 - t);
    });
  });
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* patas */}
      {([[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]] as [number, number][]).map(
        ([x, z], i) => (
          <mesh key={i} position={[x, 0.4, z]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
            <meshStandardMaterial color="#4a4a4a" />
          </mesh>
        )
      )}
      {/* fuente de la parrilla */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.5, 0.32, 0.75]} />
        <meshStandardMaterial color="#5b5b5b" />
      </mesh>
      {/* carbón encendido */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[1.3, 0.06, 0.6]} />
        <meshStandardMaterial color="#e0632f" emissive="#e0632f" emissiveIntensity={0.8} />
      </mesh>
      {/* carnes y choripanes sobre la rejilla */}
      <mesh position={[-0.35, 1.08, 0.1]}>
        <boxGeometry args={[0.4, 0.09, 0.3]} />
        <meshStandardMaterial color="#8a4a2b" />
      </mesh>
      <mesh position={[0.25, 1.08, -0.12]}>
        <boxGeometry args={[0.34, 0.09, 0.26]} />
        <meshStandardMaterial color="#a35a34" />
      </mesh>
      <mesh position={[0.35, 1.07, 0.18]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.32, 8]} />
        <meshStandardMaterial color="#b04a3a" />
      </mesh>
      {/* humo que sube */}
      <group ref={humo}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#e8e8e8" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function MesaFiesta({ pos }: { pos: [number, number] }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {/* patas */}
      {([[-1.0, -0.4], [1.0, -0.4], [-1.0, 0.4], [1.0, 0.4]] as [number, number][]).map(
        ([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]}>
            <cylinderGeometry args={[0.05, 0.05, 0.72, 6]} />
            <meshStandardMaterial color="#8a6240" />
          </mesh>
        )
      )}
      {/* mantel */}
      <mesh position={[0, 0.76, 0]}>
        <boxGeometry args={[2.4, 0.1, 1.1]} />
        <meshStandardMaterial color="#f28d7c" />
      </mesh>
      {/* platos */}
      {[-0.7, 0.1, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.84, 0.15]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* jarra de jugo */}
      <mesh position={[-0.2, 0.98, -0.25]}>
        <cylinderGeometry args={[0.12, 0.14, 0.34, 10]} />
        <meshStandardMaterial color="#f2994a" />
      </mesh>
      {/* fuente con ensalada */}
      <mesh position={[0.55, 0.88, -0.25]}>
        <cylinderGeometry args={[0.2, 0.15, 0.12, 12]} />
        <meshStandardMaterial color="#67c08a" />
      </mesh>
      {/* pancitos */}
      <mesh position={[-0.75, 0.86, -0.2]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#d9a35e" />
      </mesh>
      <mesh position={[-0.92, 0.86, -0.28]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#d9a35e" />
      </mesh>
    </group>
  );
}

/** guirnalda de banderines colgada en el muro de la casa */
function Banderines() {
  const colores = ["#e0503f", "#f2c24b", "#67c08a", "#4a9fd6", "#9a6fd0", "#ee8fbb"];
  const n = 13;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const x = -6 + t * 12;
        const y = 3.5 - Math.sin(t * Math.PI) * 0.55;
        return (
          <mesh key={i} position={[x, y, -4.8]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.16, 0.36, 3]} />
            <meshStandardMaterial color={colores[i % colores.length]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Globo({ pos, color, fase = 0 }: { pos: [number, number]; color: string; fase?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current)
      ref.current.position.y = 1.9 + Math.sin(state.clock.elapsedTime * 1.4 + fase) * 0.12;
  });
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <group ref={ref} position={[0, 1.9, 0]}>
        <mesh>
          <sphereGeometry args={[0.28, 10, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, -0.95, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.3, 4]} />
          <meshStandardMaterial color="#9a9a9a" />
        </mesh>
      </group>
    </group>
  );
}

// ---------- muebles / objetos ----------

function Sofa({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[2.4, 0.6, 1]} />
        <meshStandardMaterial color="#c97b63" />
      </mesh>
      <mesh position={[0, 0.8, -0.42]}>
        <boxGeometry args={[2.4, 0.7, 0.22]} />
        <meshStandardMaterial color="#b86a52" />
      </mesh>
    </group>
  );
}

function Tv({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.6, 0.7, 0.45]} />
        <meshStandardMaterial color="#9a7448" />
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
        <meshStandardMaterial color="#9a7448" />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.45, 0.2, 2.1]} />
        <meshStandardMaterial color="#cfe3f0" />
      </mesh>
      <mesh position={[0, 0.62, -0.85]}>
        <boxGeometry args={[1.2, 0.22, 0.4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.5, 0.5]}>
        <boxGeometry args={[1.45, 0.16, 1.1]} />
        <meshStandardMaterial color="#7fb0d6" />
      </mesh>
    </group>
  );
}

function Closet({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.3, 1.8, 0.6]} />
        <meshStandardMaterial color="#a37b52" />
      </mesh>
      <mesh position={[-0.32, 0.9, 0.31]}>
        <boxGeometry args={[0.58, 1.7, 0.04]} />
        <meshStandardMaterial color="#8a6240" />
      </mesh>
      <mesh position={[0.32, 0.9, 0.31]}>
        <boxGeometry args={[0.58, 1.7, 0.04]} />
        <meshStandardMaterial color="#8a6240" />
      </mesh>
    </group>
  );
}

function Planta({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.26, 0.32, 0.5, 10]} />
        <meshStandardMaterial color="#c97b63" />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.5, 10, 10]} />
        <meshStandardMaterial color="#6fae7d" />
      </mesh>
      <mesh position={[0.18, 1.1, 0.05]}>
        <sphereGeometry args={[0.32, 10, 10]} />
        <meshStandardMaterial color="#7cbf8a" />
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
        <meshStandardMaterial color="#a37b52" />
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
        {/* muro de la casa AL FONDO (donde está la puerta de volver adentro) */}
        <mesh position={[0, 2, -5]}>
          <boxGeometry args={[16, 4, 0.3]} />
          <meshStandardMaterial color="#efd9b0" />
        </mesh>
        {/* reja baja AL FRENTE (borde del patio, no tapa la vista) */}
        {[-5.5, 5.5].map((x) => (
          <mesh key={x} position={[x, 0.5, 4.7]}>
            <boxGeometry args={[0.16, 1, 0.16]} />
            <meshStandardMaterial color="#cfcfcf" />
          </mesh>
        ))}
        <mesh position={[0, 0.8, 4.7]}>
          <boxGeometry args={[12, 0.1, 0.1]} />
          <meshStandardMaterial color="#cfcfcf" />
        </mesh>
        {Array.from({ length: 13 }, (_, i) => -6 + i).map((x) => (
          <mesh key={x} position={[x, 0.45, 4.7]}>
            <boxGeometry args={[0.07, 0.9, 0.07]} />
            <meshStandardMaterial color="#dcdcdc" />
          </mesh>
        ))}
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
      // rincón de las mascotas a la izquierda; la fiesta ocupa el resto
      return (
        <group>
          <CasitaPerro pos={[-5.8, -3]} />
          <Parrilla pos={[4.9, -3.5]} />
          <MesaFiesta pos={[0.8, -3.4]} />
          <Banderines />
          <Globo pos={[-6.3, -4.3]} color="#e0503f" />
          <Globo pos={[6.3, -4.3]} color="#f2c24b" fase={1.3} />
          <Globo pos={[-5.5, 4.5]} color="#4a9fd6" fase={2.1} />
          <Globo pos={[5.5, 4.5]} color="#9a6fd0" fase={0.7} />
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
            <meshStandardMaterial color="#7fb0d6" />
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
  principal: "#fde68a",
  patio: "#bae6fd",
  "pasillo-der": "#fef3c7",
  "hab-der-arriba": "#fef3c7",
  "hab-der-abajo": "#fef3c7",
  "pasillo-izq": "#fef3c7",
  "tu-habitacion": "#e9d5ff",
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
  gatoAlimentado,
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
    <Canvas shadows camera={{ position: [0, 6.8, 9.8], fov: 48 }} style={{ position: "absolute", inset: 0 }}>
      <CameraRig onDistancia={(d) => setFactorEtiqueta(10 * (d / DIST_BASE))} />
      <AutoSombras />
      <ambientLight intensity={area.id === "patio" ? 0.85 : 0.75} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={0.95}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* color de fondo del cielo/ambiente */}
      <color attach="background" args={[FONDO_AREA[area.id]]} />
      <fog attach="fog" args={[FONDO_AREA[area.id], 25, 60]} />

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

      {/* personajes: familia en el living, invitados del asado en el patio */}
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

      {/* mascotas y comida (rincón izquierdo del patio, lejos de la parrilla) */}
      {area.id === "patio" && (
        <>
          <Perro pos={[-4.6, -1.6]} alimentado={perroAlimentado} onTap={() => onMascota("perro")} />
          <Gato pos={[-5.5, 0.9]} alimentado={gatoAlimentado} onTap={() => onMascota("gato")} />
          <Tazon pos={[-3.7, -0.9]} color="#b5793f" lleno={perroAlimentado} />
          <Tazon pos={[-3.1, -0.5]} color="#4a9fd6" lleno />
          {/* tazón de comida del gato */}
          <Tazon pos={[-5.4, 1.9]} color="#c98f3d" lleno={gatoAlimentado} />
          {mostrarEtiquetas && (
            <Html position={[-4.6, 2, -1.6]} center distanceFactor={factorEtiqueta} zIndexRange={[12, 0]}
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
