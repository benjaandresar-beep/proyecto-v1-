"use client";

// Escena 3D del colegio explorable. Renderiza el área actual (sala de clases o
// patio) con su puerta animada. El patio es más amplio, con cancha, baños,
// mesas de ping pong, palmeras y cancha de vóleibol.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import { ChargeMap, EmotionId, EMOTIONS } from "@/lib/emotions";
import { ExerciseAnimation } from "@/lib/exercises";
import { AvatarConfig } from "@/lib/storage";
import { AreaDef, PuertaDef } from "@/lib/escuela";

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

export type LugarPatio = "cancha" | "voley" | "pingpong" | "banos";

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
  onLugar: (l: LugarPatio) => void;
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
    const distPorAncho = frame / (Math.tan(vFov / 2) * aspect);
    const d = Math.max(DIST_BASE, distPorAncho);
    const objetivo = new THREE.Vector3(0, 0.8, 0.2);
    const direccion = new THREE.Vector3(0, 6, 9.8).normalize();
    persp.position.copy(objetivo.clone().add(direccion.multiplyScalar(d)));
    persp.lookAt(objetivo);
    persp.updateProjectionMatrix();
    onDistancia(d);
  }, [camera, size, frame, onDistancia]);
  return null;
}

// ---------- jugador ----------

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
  const ultimoObjetivo = useRef(objetivo);
  if (objetivo !== ultimoObjetivo.current) {
    ultimoObjetivo.current = objetivo;
    llegadaPendiente.current = true;
  }
  const VEL = 3;
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

function NpcAlumno({
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
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.5, 2.2, 0.22]} />
        <meshStandardMaterial color="#8a6240" flatShading />
      </mesh>
      <mesh position={[0, 1.05, -0.02]}>
        <boxGeometry args={[1.15, 1.95, 0.05]} />
        <meshStandardMaterial color="#2b2417" />
      </mesh>
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

// ---------- sala de clases ----------

function Mesa({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
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
  );
}

function Sala() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#dcc89f" />
      </mesh>
      <mesh position={[0, 2.2, -5]}>
        <planeGeometry args={[14, 4.4]} />
        <meshStandardMaterial color="#bfe3f2" />
      </mesh>
      <mesh position={[-7, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#cdeaf6" />
      </mesh>
      <mesh position={[7, 2.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#cdeaf6" />
      </mesh>
      <mesh position={[-2.2, 2.2, -4.93]}>
        <boxGeometry args={[3.6, 1.8, 0.08]} />
        <meshStandardMaterial color="#3f7d5a" />
      </mesh>
      <mesh position={[-2.2, 2.2, -4.97]}>
        <boxGeometry args={[3.9, 2.1, 0.04]} />
        <meshStandardMaterial color="#8a6240" />
      </mesh>
      {[1, 3.2].map((x) => (
        <mesh key={x} position={[x, 2.4, -4.95]}>
          <boxGeometry args={[1.4, 1.2, 0.06]} />
          <meshStandardMaterial color="#f3fbff" emissive="#dff2ff" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {([[-3.5, 0.5], [0, -0.5], [3.5, 0.5], [-1.8, 2.2], [2, 2.4]] as [number, number][]).map(
        ([x, z], i) => (
          <Mesa key={i} x={x} z={z} />
        )
      )}
    </group>
  );
}

// ---------- patio: objetos ----------

function Palmera({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.3, 0]} rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.16, 0.24, 2.6, 8]} />
        <meshStandardMaterial color="#9c7a4e" flatShading />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3).map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.5, 2.6, Math.sin(a) * 0.5]} rotation={[0, -a, 0.9]}>
          <coneGeometry args={[0.18, 1.3, 4]} />
          <meshStandardMaterial color="#4f9e5e" flatShading />
        </mesh>
      ))}
      {/* cocos */}
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#6b4a2a" flatShading />
      </mesh>
    </group>
  );
}

function Cancha({ x, z, onTap }: { x: number; z: number; onTap: () => void }) {
  return (
    <group
      position={[x, 0, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      {/* superficie */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[5, 7]} />
        <meshStandardMaterial color="#c2603f" />
      </mesh>
      {/* líneas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.9, 1, 24]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[4.6, 0.08]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* aros */}
      {[-3.4, 3.4].map((zz) => (
        <group key={zz} position={[0, 0, zz]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
            <meshStandardMaterial color="#9a9a9a" flatShading />
          </mesh>
          <mesh position={[0, 2.7, zz > 0 ? -0.2 : 0.2]}>
            <boxGeometry args={[1, 0.7, 0.08]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2.45, zz > 0 ? -0.35 : 0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.28, 0.04, 8, 16]} />
            <meshStandardMaterial color="#e0503f" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CanchaVoley({ x, z, onTap }: { x: number; z: number; onTap: () => void }) {
  return (
    <group
      position={[x, 0, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[4.4, 6]} />
        <meshStandardMaterial color="#e0c27a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[4.4, 0.08]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* postes + red */}
      {[-2.2, 2.2].map((px) => (
        <mesh key={px} position={[px, 1, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2, 6]} />
          <meshStandardMaterial color="#9a9a9a" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[4.4, 0.5, 0.04]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function PingPong({ x, z, onTap }: { x: number; z: number; onTap: () => void }) {
  return (
    <group
      position={[x, 0, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.85]} />
        <meshStandardMaterial color="#2f7d4f" flatShading />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[0.04, 0.2, 0.85]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {([[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]] as [number, number][]).map(
        ([px, pz], i) => (
          <mesh key={i} position={[px, 0.3, pz]}>
            <cylinderGeometry args={[0.04, 0.04, 0.6, 6]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
        )
      )}
    </group>
  );
}

function Banos({ x, z, onTap }: { x: number; z: number; onTap: () => void }) {
  return (
    <group
      position={[x, 0, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3, 2, 2]} />
        <meshStandardMaterial color="#d7d2c4" flatShading />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <boxGeometry args={[3.2, 0.3, 2.2]} />
        <meshStandardMaterial color="#9a6a52" flatShading />
      </mesh>
      {/* puertas */}
      <mesh position={[-0.7, 0.85, 1.01]}>
        <boxGeometry args={[0.8, 1.7, 0.06]} />
        <meshStandardMaterial color="#4a6e8a" flatShading />
      </mesh>
      <mesh position={[0.7, 0.85, 1.01]}>
        <boxGeometry args={[0.8, 1.7, 0.06]} />
        <meshStandardMaterial color="#7a5b9a" flatShading />
      </mesh>
    </group>
  );
}

function Patio() {
  return (
    <group>
      {/* pasto grande */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 20]} />
        <meshStandardMaterial color="#9ccb6a" />
      </mesh>
      {/* edificio del colegio al fondo (con la puerta de volver) */}
      <mesh position={[0, 2.2, -6.2]}>
        <boxGeometry args={[24, 4.4, 1]} />
        <meshStandardMaterial color="#e9c98f" flatShading />
      </mesh>
      <mesh position={[0, 4.6, -6.2]}>
        <boxGeometry args={[24, 0.5, 1.3]} />
        <meshStandardMaterial color="#b06a4a" flatShading />
      </mesh>
      {/* ventanas del edificio */}
      {[-7, -4.5, 4.5, 7].map((x) => (
        <mesh key={x} position={[x, 2.4, -5.68]}>
          <boxGeometry args={[1.5, 1.2, 0.05]} />
          <meshStandardMaterial color="#bfe3f2" emissive="#cdeafd" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* franja de cemento frente al edificio */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -4.4]}>
        <planeGeometry args={[24, 2.4]} />
        <meshStandardMaterial color="#c9c3b4" />
      </mesh>
    </group>
  );
}

// ---------- escena ----------

const FONDO: Record<string, string> = { sala: "#bfe3f2", patio: "#9fd8f0" };

export default function EscuelaScene({
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
  onLugar,
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
    <Canvas camera={{ position: [0, 6.8, 9.8], fov: 48 }} style={{ position: "absolute", inset: 0 }}>
      <CameraRig frame={area.frame} onDistancia={(d) => setFactorEtiqueta(10 * (d / DIST_BASE))} />
      <color attach="background" args={[FONDO[area.id]]} />
      <ambientLight intensity={area.id === "patio" ? 1 : 0.85} />
      <directionalLight position={[5, 9, 4]} intensity={1.1} />

      {area.id === "sala" ? <Sala /> : <Patio />}

      {/* superficie invisible para caminar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onPointerDown={clickPiso}>
        <planeGeometry args={[26, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* puertas */}
      {area.puertas.map((p) => (
        <Puerta3D key={p.id} puerta={p} abriendo={puertaAbriendo === p.id} onPuerta={onPuerta} />
      ))}

      {/* lugares del patio */}
      {area.id === "patio" && (
        <>
          <Cancha x={-5.5} z={-1.2} onTap={() => onLugar("cancha")} />
          <CanchaVoley x={5.5} z={-0.6} onTap={() => onLugar("voley")} />
          <PingPong x={-1.6} z={3.2} onTap={() => onLugar("pingpong")} />
          <PingPong x={1.6} z={3.2} onTap={() => onLugar("pingpong")} />
          <Banos x={8} z={-4} onTap={() => onLugar("banos")} />
          {([[-9, 3.5], [9, 3.5], [-9, -3], [2.2, -2.6]] as [number, number][]).map(([x, z], i) => (
            <Palmera key={i} x={x} z={z} />
          ))}
          {mostrarEtiquetas && (
            <Html position={[8, 2.6, -4]} center distanceFactor={factorEtiqueta} zIndexRange={[12, 0]}
              style={{ pointerEvents: "none", textAlign: "center" }}>
              <div className="npc-nombre">🚻 Baños</div>
            </Html>
          )}
        </>
      )}

      {/* alumnos (solo sala) */}
      {npcs.map((npc) => (
        <NpcAlumno
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
