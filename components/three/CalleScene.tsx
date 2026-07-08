"use client";

// Escena 3D del contexto Calle explorable: la calle (sobrecarga urbana, autos,
// transeúntes) con acceso a una plaza/parque con caminito, árboles, juegos
// (columpios, inflable, resbalín) y niños jugando.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import AutoSombras from "./AutoSombras";
import { ChargeMap, EmotionId, EMOTIONS } from "@/lib/emotions";
import { ExerciseAnimation } from "@/lib/exercises";
import { AvatarConfig } from "@/lib/storage";
import { AreaDef, PuertaDef } from "@/lib/calle";

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
  const ref = useRef<THREE.Group>(null);
  const posInicial = useRef<[number, number, number]>([npc.pos[0], 0, npc.pos[1]]);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.position.x = THREE.MathUtils.damp(g.position.x, npc.pos[0], 1.6, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, npc.pos[1], 1.6, delta);
  });
  return (
    <group
      ref={ref}
      position={posInicial.current}
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
      {/* portón de reja (acceso a la plaza) */}
      <mesh position={[-0.75, 1.1, 0]}>
        <boxGeometry args={[0.18, 2.2, 0.18]} />
        <meshStandardMaterial color="#cfcfcf" />
      </mesh>
      <mesh position={[0.75, 1.1, 0]}>
        <boxGeometry args={[0.18, 2.2, 0.18]} />
        <meshStandardMaterial color="#cfcfcf" />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[1.8, 0.2, 0.2]} />
        <meshStandardMaterial color="#9a9a9a" />
      </mesh>
      <group ref={panel} position={[-0.7, 0, 0]}>
        <mesh position={[0.6, 1.05, 0]}>
          <boxGeometry args={[1.2, 1.9, 0.07]} />
          <meshStandardMaterial color="#bdbdbd" />
        </mesh>
      </group>
    </group>
  );
}

// ---------- calle ----------

function Auto({
  z,
  color,
  direccion,
  periodo,
  desfase,
}: {
  z: number;
  color: string;
  direccion: 1 | -1;
  periodo: number;
  desfase: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const ciclo = ((state.clock.elapsedTime + desfase) % periodo) / periodo;
    g.position.x = direccion * (-24 + ciclo * 48);
  });
  return (
    <group ref={ref} position={[direccion * -24, 0, z]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.7, 0.5, 0.85]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.8]} />
        <meshStandardMaterial color="#dff2ff" />
      </mesh>
      {([[-0.55, 0.32], [0.55, 0.32], [-0.55, -0.32], [0.55, -0.32]] as [number, number][]).map(
        ([px, pz], i) => (
          <mesh key={i} position={[px, 0.18, pz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.12, 10]} />
            <meshStandardMaterial color="#2c2c2c" />
          </mesh>
        )
      )}
    </group>
  );
}

function CalleAmbiente() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 20]} />
        <meshStandardMaterial color="#e7e5e4" />
      </mesh>
      {/* calzada */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -2.6]}>
        <planeGeometry args={[26, 4.4]} />
        <meshStandardMaterial color="#5d5d61" />
      </mesh>
      {[-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10].map((x) => (
        <mesh key={x} position={[x, 0.01, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.16]} />
          <meshBasicMaterial color="#f2f2f2" />
        </mesh>
      ))}
      <mesh position={[0, 0.08, -0.35]}>
        <boxGeometry args={[26, 0.16, 0.18]} />
        <meshStandardMaterial color="#b9b2a6" />
      </mesh>
      {/* edificios al fondo */}
      {(
        [
          [-7, 3.4, "#d98f7e"],
          [-2.5, 4.2, "#9fb4c7"],
          [2.5, 3, "#c9b878"],
          [7, 4, "#bca0c9"],
        ] as [number, number, string][]
      ).map(([x, alto, color], i) => (
        <group key={i} position={[x, 0, -5.6]}>
          <mesh position={[0, alto / 2, 0]}>
            <boxGeometry args={[4, alto, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {[0.8, 1.8, 2.6].map(
            (y) =>
              y < alto - 0.4 && (
                <mesh key={y} position={[0, y, 0.51]}>
                  <boxGeometry args={[2.8, 0.45, 0.04]} />
                  <meshStandardMaterial color="#fdf3c9" emissive="#fdf3c9" emissiveIntensity={0.4} />
                </mesh>
              )
          )}
        </group>
      ))}
      {/* poste y árbol */}
      <group position={[-8, 0, -0.1]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
          <meshStandardMaterial color="#6b6b6b" />
        </mesh>
        <mesh position={[0, 3.05, 0]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color="#fdf3c9" emissive="#fdf3c9" emissiveIntensity={0.8} />
        </mesh>
      </group>
      {/* autos cruzando */}
      <Auto z={-1.6} color="#c4584f" direccion={1} periodo={9} desfase={0} />
      <Auto z={-3.4} color="#4a7dd6" direccion={-1} periodo={12} desfase={5} />
    </group>
  );
}

// ---------- plaza ----------

function Arbol({ x, z, escala = 1 }: { x: number; z: number; escala?: number }) {
  return (
    <group position={[x, 0, z]} scale={escala}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 1.4, 6]} />
        <meshStandardMaterial color="#8a6240" />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.8, 10, 10]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      <mesh position={[0.4, 2.1, 0.1]}>
        <sphereGeometry args={[0.5, 10, 10]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
    </group>
  );
}

function Columpios({ x, z }: { x: number; z: number }) {
  const a1 = useRef<THREE.Group>(null);
  const a2 = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (a1.current) a1.current.rotation.x = Math.sin(t * 1.6) * 0.5;
    if (a2.current) a2.current.rotation.x = Math.sin(t * 1.6 + 1.2) * 0.4;
  });
  return (
    <group position={[x, 0, z]}>
      {/* estructura */}
      {[-1.6, 1.6].map((sx) => (
        <group key={sx}>
          <mesh position={[sx, 1.3, -0.6]} rotation={[0, 0, sx > 0 ? -0.25 : 0.25]}>
            <cylinderGeometry args={[0.08, 0.08, 2.8, 6]} />
            <meshStandardMaterial color="#c0504a" />
          </mesh>
          <mesh position={[sx, 1.3, 0.6]} rotation={[0, 0, sx > 0 ? -0.25 : 0.25]}>
            <cylinderGeometry args={[0.08, 0.08, 2.8, 6]} />
            <meshStandardMaterial color="#c0504a" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3.6, 6]} />
        <meshStandardMaterial color="#e0a030" />
      </mesh>
      {/* dos columpios */}
      {[a1, a2].map((ref, i) => (
        <group key={i} ref={ref} position={[i === 0 ? -0.8 : 0.8, 2.5, 0]}>
          {[-0.18, 0.18].map((dx) => (
            <mesh key={dx} position={[dx, -1, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 2, 4]} />
              <meshStandardMaterial color="#3a3a3a" />
            </mesh>
          ))}
          <mesh position={[0, -2, 0]}>
            <boxGeometry args={[0.6, 0.08, 0.34]} />
            <meshStandardMaterial color={i === 0 ? "#4a9fd6" : "#f2c24b"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Inflable({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) {
      const w = 1 + Math.sin(s.clock.elapsedTime * 2.5) * 0.02;
      ref.current.scale.set(1, w, 1);
    }
  });
  return (
    <group position={[x, 0, z]} ref={ref}>
      {/* base */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3.2, 1, 3] } />
        <meshStandardMaterial color="#e0503f" />
      </mesh>
      {/* bordes inflados */}
      {([[-1.4, 0], [1.4, 0], [0, -1.3], [0, 1.3]] as [number, number][]).map(([bx, bz], i) => (
        <mesh key={i} position={[bx, 1.2, bz]}>
          <sphereGeometry args={[0.5, 10, 10]} />
          <meshStandardMaterial color={["#4a9fd6", "#67c08a", "#f2c24b", "#9a6fd0"][i]} />
        </mesh>
      ))}
      {/* arcos de entrada */}
      {[-0.7, 0.7].map((ax) => (
        <mesh key={ax} position={[ax, 1.6, 1.5]}>
          <cylinderGeometry args={[0.18, 0.18, 2.2, 8]} />
          <meshStandardMaterial color="#ee8fbb" />
        </mesh>
      ))}
      <mesh position={[0, 2.7, 1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 1.6, 8]} />
        <meshStandardMaterial color="#ee8fbb" />
      </mesh>
    </group>
  );
}

function Resbalin({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* plataforma */}
      <mesh position={[0, 1.2, -0.4]}>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color="#67c08a" />
      </mesh>
      {/* escalera */}
      {[0.3, 0.6, 0.9].map((y) => (
        <mesh key={y} position={[0, y, -0.95]}>
          <boxGeometry args={[0.8, 0.06, 0.1]} />
          <meshStandardMaterial color="#9a7448" />
        </mesh>
      ))}
      {/* tobogán */}
      <mesh position={[0, 0.7, 0.6]} rotation={[0.7, 0, 0]}>
        <boxGeometry args={[0.7, 0.08, 1.8]} />
        <meshStandardMaterial color="#f2c24b" />
      </mesh>
    </group>
  );
}

function Banca({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.4, 0.12, 0.5]} />
        <meshStandardMaterial color="#b0894e" />
      </mesh>
      <mesh position={[0, 0.7, -0.22]}>
        <boxGeometry args={[1.4, 0.5, 0.1]} />
        <meshStandardMaterial color="#b0894e" />
      </mesh>
    </group>
  );
}

function Plaza() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      {/* caminito central */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2.2, 18]} />
        <meshStandardMaterial color="#cdb98f" />
      </mesh>
      {/* árboles a ambos lados del caminito */}
      {[-4.5, -2.5].flatMap((z) =>
        [-3.4, -5.2, 3.4, 5.2].map((x) => ({ x, z }))
      ).map((p, i) => (
        <Arbol key={`a${i}`} x={p.x} z={p.z} escala={0.95 + (i % 3) * 0.05} />
      ))}
      {[0.5, 2.5].flatMap((z) =>
        [-4.4, -6, 4.4, 6].map((x) => ({ x, z }))
      ).map((p, i) => (
        <Arbol key={`b${i}`} x={p.x} z={p.z} escala={0.95 + (i % 3) * 0.05} />
      ))}
      {/* sector de juegos al fondo */}
      <Columpios x={-3.4} z={-3.6} />
      <Inflable x={3.4} z={-3.4} />
      <Resbalin x={0} z={-3.8} />
      {/* bancas junto al caminito */}
      <Banca x={-1.7} z={2} rot={Math.PI / 2} />
      <Banca x={1.7} z={0.5} rot={-Math.PI / 2} />
      {/* arbustos del borde */}
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]}>
          <boxGeometry args={[0.6, 0.8, 12]} />
          <meshStandardMaterial color="#4ade80" />
        </mesh>
      ))}
    </group>
  );
}

const FONDO: Record<string, string> = { calle: "#bfdbfe", plaza: "#bae6fd" };

export default function CalleScene({
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
      <ambientLight intensity={0.85} />
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

      {area.id === "calle" ? <CalleAmbiente /> : <Plaza />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onPointerDown={clickPiso}>
        <planeGeometry args={[26, 20]} />
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
        audifonos={audifonos}
        jugadorRef={jugadorRef}
        onLlegada={onLlegada}
      />

      {orbe && <OrbeViajero orbe={orbe} jugadorRef={jugadorRef} onLlega={onOrbeLlega} />}
    </Canvas>
  );
}
