"use client";

// Escena 3D del centro de terapia explorable: patio con reja, recepción y las
// tres salas (Psicología, Fonoaudiología, Terapia Ocupacional) con sus objetos.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import AutoSombras from "./AutoSombras";
import { ChargeMap, EmotionId, EMOTIONS } from "@/lib/emotions";
import { ExerciseAnimation } from "@/lib/exercises";
import { AvatarConfig } from "@/lib/storage";
import { AreaDef, PuertaDef } from "@/lib/terapia";

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
  npcs: Npc3D[];
  burbujas: Record<string, EmotionId | undefined>;
  objetivo: [number, number];
  orbe: Orbe | null;
  mostrarEtiquetas: boolean;
  puertaAbriendo: string | null;
  onSuelo: (x: number, z: number) => void;
  onNpc: (id: string) => void;
  onPuerta: (p: PuertaDef) => void;
  onOrbeLlega: () => void;
  onLlegada: () => void;
}

const DIST_BASE = 11.6;

function CameraRig({ frame, onDistancia }: { frame: number; onDistancia: (d: number) => void }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const vFov = THREE.MathUtils.degToRad(persp.fov);
    const d = Math.max(DIST_BASE, frame / (Math.tan(vFov / 2) * aspect));
    const objetivo = new THREE.Vector3(0, 0.8, 0.2);
    const dir = new THREE.Vector3(0, 6, 9.8).normalize();
    persp.position.copy(objetivo.clone().add(dir.multiplyScalar(d)));
    persp.lookAt(objetivo);
    persp.updateProjectionMatrix();
    onDistancia(d);
  }, [camera, size, frame, onDistancia]);
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
  const [caminando, setCaminando] = useState(false);
  const caminandoRef = useRef(false);
  const llegadaPendiente = useRef(false);
  const ultimo = useRef(objetivo);
  if (objetivo !== ultimo.current) {
    ultimo.current = objetivo;
    llegadaPendiente.current = true;
  }
  useFrame((_, delta) => {
    const g = jugadorRef.current;
    if (!g) return;
    const dx = objetivo[0] - g.position.x;
    const dz = objetivo[1] - g.position.z;
    const dist = Math.hypot(dx, dz);
    let mov = false;
    if (dist > 0.05) {
      mov = true;
      const paso = Math.min(3 * delta, dist);
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

function NpcGen({
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
    panel.current.rotation.y = THREE.MathUtils.damp(panel.current.rotation.y, abriendo ? -Math.PI * 0.62 : 0, 7, delta);
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
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.5, 2.2, 0.22]} />
        <meshStandardMaterial color="#8a6240" />
      </mesh>
      <mesh position={[0, 1.05, -0.02]}>
        <boxGeometry args={[1.15, 1.95, 0.05]} />
        <meshStandardMaterial color="#2b2417" />
      </mesh>
      <group ref={panel} position={[-0.57, 0, 0.1]}>
        <mesh position={[0.57, 1.05, 0]}>
          <boxGeometry args={[1.08, 1.92, 0.09]} />
          <meshStandardMaterial color="#b9824e" />
        </mesh>
        <mesh position={[1.0, 1.05, 0.08]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#f2c24b" />
        </mesh>
      </group>
    </group>
  );
}

// ---------- objetos ----------

function Sillon({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[1.5, 0.5, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.7, -0.36]}>
        <boxGeometry args={[1.5, 0.7, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-0.7, 0.55, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.7, 0.55, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Juguete({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <mesh position={[x, 0.18, z]}>
      <boxGeometry args={[0.32, 0.32, 0.32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Mesita({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1, 0.08, 0.7]} />
        <meshStandardMaterial color="#c89b6a" />
      </mesh>
      {([[-0.4, -0.27], [0.4, -0.27], [-0.4, 0.27], [0.4, 0.27]] as [number, number][]).map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.22, pz]}>
          <cylinderGeometry args={[0.04, 0.04, 0.45, 6]} />
          <meshStandardMaterial color="#9a7448" />
        </mesh>
      ))}
    </group>
  );
}

function TelefonoJuguete({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.5, z]}>
      <mesh>
        <boxGeometry args={[0.34, 0.18, 0.5]} />
        <meshStandardMaterial color="#e0503f" />
      </mesh>
      <mesh position={[0, 0.18, -0.12]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.24, 0.12]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* ruedas (de arrastre) */}
      <mesh position={[-0.14, -0.12, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.05, 8]} />
        <meshStandardMaterial color="#f2c24b" />
      </mesh>
      <mesh position={[0.14, -0.12, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.05, 8]} />
        <meshStandardMaterial color="#4a9fd6" />
      </mesh>
    </group>
  );
}

function Columpio({ x, z }: { x: number; z: number }) {
  const asiento = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (asiento.current) asiento.current.rotation.x = Math.sin(s.clock.elapsedTime * 1.5) * 0.35;
  });
  return (
    <group position={[x, 0, z]}>
      {/* marco A */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * 1.1, 1.2, -0.5]} rotation={[0, 0, sx * 0.25]}>
            <cylinderGeometry args={[0.07, 0.07, 2.6, 6]} />
            <meshStandardMaterial color="#b06a4a" />
          </mesh>
          <mesh position={[sx * 1.1, 1.2, 0.5]} rotation={[0, 0, sx * 0.25]}>
            <cylinderGeometry args={[0.07, 0.07, 2.6, 6]} />
            <meshStandardMaterial color="#b06a4a" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 2.6, 6]} />
        <meshStandardMaterial color="#8a6240" />
      </mesh>
      {/* asiento que se mece */}
      <group ref={asiento} position={[0, 2.35, 0]}>
        <mesh position={[-0.3, -1, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2, 4]} />
          <meshStandardMaterial color="#5a5a5a" />
        </mesh>
        <mesh position={[0.3, -1, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2, 4]} />
          <meshStandardMaterial color="#5a5a5a" />
        </mesh>
        <mesh position={[0, -2, 0]}>
          <boxGeometry args={[0.8, 0.1, 0.4]} />
          <meshStandardMaterial color="#f2c24b" />
        </mesh>
      </group>
    </group>
  );
}

function Trampolin({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.2, 20]} />
        <meshStandardMaterial color="#4a7dd6" />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.05, 20]} />
        <meshStandardMaterial color="#2c2c2c" />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4).map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.95, 0.2, Math.sin(a) * 0.95]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 4]} />
          <meshStandardMaterial color="#9a9a9a" />
        </mesh>
      ))}
    </group>
  );
}

function Plasticinas({ x, z }: { x: number; z: number }) {
  const colores = ["#e0503f", "#f2c24b", "#67c08a", "#4a9fd6", "#ee8fbb"];
  return (
    <group position={[x, 0, z]}>
      <Mesita x={0} z={0} />
      {colores.map((c, i) => (
        <mesh key={i} position={[-0.32 + i * 0.16, 0.56, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 10]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

function Bloques({ x, z }: { x: number; z: number }) {
  const piezas: [number, number, number, string][] = [
    [0, 0.15, 0, "#e0503f"],
    [0, 0.45, 0, "#4a9fd6"],
    [0.32, 0.15, 0.1, "#f2c24b"],
    [-0.3, 0.15, -0.1, "#67c08a"],
    [0.05, 0.75, 0, "#9a6fd0"],
  ];
  return (
    <group position={[x, 0, z]}>
      {piezas.map(([px, py, pz, c], i) => (
        <mesh key={i} position={[px, py, pz]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- shells ----------

function MurosSala({ piso, ventana }: { piso: string; ventana?: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color={piso} />
      </mesh>
      <mesh position={[0, 2.2, -5]}>
        <planeGeometry args={[14, 4.4]} />
        <meshStandardMaterial color="#efe6da" />
      </mesh>
      <mesh position={[-7, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#e6dccd" />
      </mesh>
      <mesh position={[7, 2.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#e6dccd" />
      </mesh>
      {ventana && (
        <group position={[3.4, 2.4, -4.93]}>
          <mesh>
            <boxGeometry args={[2.2, 1.5, 0.06]} />
            <meshStandardMaterial color="#bfe3f2" emissive="#cdeafd" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[0.06, 1.5, 0.04]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
          <mesh position={[0, 0, 0.04]}>
            <boxGeometry args={[2.2, 0.06, 0.04]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
          {/* vistita verde del patio */}
          <mesh position={[0.5, -0.4, -0.04]}>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color="#4ade80" />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Patio() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      {/* camino al ingreso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2, 9]} />
        <meshStandardMaterial color="#cabfa6" />
      </mesh>
      {/* fachada de la casa al fondo */}
      <mesh position={[0, 2, -5.4]}>
        <boxGeometry args={[14, 4, 0.6]} />
        <meshStandardMaterial color="#e7c79a" />
      </mesh>
      <mesh position={[0, 4.2, -5.4]}>
        <boxGeometry args={[14.6, 0.6, 1]} />
        <meshStandardMaterial color="#b0604a" />
      </mesh>
      {/* letrero */}
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 2.6, -5.05]}>
          <boxGeometry args={[1.4, 1, 0.05]} />
          <meshStandardMaterial color="#bfe3f2" emissive="#cdeafd" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* reja al frente con porton (dos hojas y pilares) */}
      {[-6, 6].map((x) => (
        <mesh key={x} position={[x, 1, 4.6]}>
          <boxGeometry args={[0.3, 2, 0.3]} />
          <meshStandardMaterial color="#cfcfcf" />
        </mesh>
      ))}
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.9, 4.6]}>
          <boxGeometry args={[0.18, 1.8, 0.18]} />
          <meshStandardMaterial color="#9a9a9a" />
        </mesh>
      ))}
      {[-5, -3.5, -2.2, 3.5, 5, 2.2].map((x, i) => (
        <mesh key={i} position={[x, 0.85, 4.6]}>
          <boxGeometry args={[0.08, 1.7, 0.08]} />
          <meshStandardMaterial color="#bdbdbd" />
        </mesh>
      ))}
      {[-4, 4].map((x) => (
        <mesh key={x} position={[x, 1.6, 4.6]}>
          <boxGeometry args={[4, 0.1, 0.1]} />
          <meshStandardMaterial color="#bdbdbd" />
        </mesh>
      ))}
      {/* arbolitos */}
      {([[-7, 1], [7, 1], [-7, -2], [7, -2]] as [number, number][]).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.14, 0.18, 1.2, 6]} />
            <meshStandardMaterial color="#8a6240" />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.7, 10, 10]} />
            <meshStandardMaterial color="#4ade80" />
          </mesh>
        </group>
      ))}
      {/* banca */}
      <mesh position={[-3.6, 0.4, 1.5]}>
        <boxGeometry args={[1.6, 0.15, 0.5]} />
        <meshStandardMaterial color="#b0894e" />
      </mesh>
    </group>
  );
}

function Recepcion() {
  return (
    <group>
      <MurosSala piso="#fde68a" />
      {/* mesón de recepción */}
      <mesh position={[4.4, 0.55, -3]}>
        <boxGeometry args={[3, 1.1, 1]} />
        <meshStandardMaterial color="#a3754a" />
      </mesh>
      <mesh position={[4.4, 1.15, -3]}>
        <boxGeometry args={[3.2, 0.1, 1.2]} />
        <meshStandardMaterial color="#c89b6a" />
      </mesh>
      {/* sillas de espera */}
      {[-5, -4, -3].map((x) => (
        <mesh key={x} position={[x, 0.35, 3.6]}>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color="#7fb0d6" />
        </mesh>
      ))}
      {/* alfombra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]}>
        <circleGeometry args={[2.2, 24]} />
        <meshStandardMaterial color="#cdb89a" />
      </mesh>
    </group>
  );
}

const FONDO: Record<string, string> = {
  patio: "#bae6fd",
  recepcion: "#fef3c7",
  psicologia: "#f3e8ff",
  fonoaudiologia: "#dbeafe",
  "terapia-ocupacional": "#fef9c3",
};

export default function TerapiaScene({
  area,
  avatar,
  charge,
  abrumado,
  animacionEjercicio,
  npcs,
  burbujas,
  objetivo,
  orbe,
  mostrarEtiquetas,
  puertaAbriendo,
  onSuelo,
  onNpc,
  onPuerta,
  onOrbeLlega,
  onLlegada,
}: SceneProps) {
  const jugadorRef = useRef<THREE.Group | null>(null);
  const [factorEtiqueta, setFactorEtiqueta] = useState(10);
  const [xMax, zMin, zMax] = area.limites;

  function clickPiso(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSuelo(
      THREE.MathUtils.clamp(e.point.x, -xMax, xMax),
      THREE.MathUtils.clamp(e.point.z, zMin, zMax)
    );
  }

  return (
    <Canvas shadows camera={{ position: [0, 6.8, 9.8], fov: 48 }} style={{ position: "absolute", inset: 0 }}>
      <CameraRig frame={area.frame} onDistancia={(d) => setFactorEtiqueta(10 * (d / DIST_BASE))} />
      <color attach="background" args={[FONDO[area.id]]} />
      <fog attach="fog" args={[FONDO[area.id], 25, 60]} />
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

      {area.id === "patio" && <Patio />}
      {area.id === "recepcion" && <Recepcion />}
      {area.id === "psicologia" && (
        <group>
          <MurosSala piso="#e9d5ff" />
          <Sillon x={-3} z={-2.2} color="#7a6db0" />
          <Sillon x={-3} z={1.4} color="#9a6fd0" />
          <Mesita x={3.4} z={-2} />
          <Juguete x={3.1} z={-1.6} color="#e0503f" />
          <Juguete x={3.6} z={-2.2} color="#f2c24b" />
          <Juguete x={3.3} z={-2.6} color="#67c08a" />
        </group>
      )}
      {area.id === "fonoaudiologia" && (
        <group>
          <MurosSala piso="#bfdbfe" ventana />
          <Mesita x={-3} z={-1} />
          <TelefonoJuguete x={-3} z={-1} />
          <Juguete x={-1.4} z={1.5} color="#ee8fbb" />
          <Juguete x={-0.9} z={1.8} color="#4a9fd6" />
        </group>
      )}
      {area.id === "terapia-ocupacional" && (
        <group>
          <MurosSala piso="#fef08a" />
          <Columpio x={-4} z={-1.5} />
          <Trampolin x={3.6} z={-2} />
          <Plasticinas x={2.6} z={2} />
          <Bloques x={-1.5} z={2.2} />
        </group>
      )}

      {/* superficie invisible para caminar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onPointerDown={clickPiso}>
        <planeGeometry args={[20, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {area.puertas.map((p) => (
        <Puerta3D key={p.id} puerta={p} abriendo={puertaAbriendo === p.id} onPuerta={onPuerta} />
      ))}

      {npcs.map((npc) => (
        <NpcGen
          key={npc.id}
          npc={npc}
          emocion={burbujas[npc.id]}
          factorEtiqueta={factorEtiqueta}
          mostrar={mostrarEtiquetas}
          onNpc={onNpc}
        />
      ))}

      <Jugador
        key={area.id}
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
