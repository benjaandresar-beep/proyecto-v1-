"use client";

// Escena 3D genérica de un contexto (Escuela / Casa / Calle, sección 4 de la spec).
// Solo renderiza el mundo: el estado del juego vive en ContextGame3D.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import CharacterMesh from "./CharacterMesh";
import { ChargeMap, EmotionId, EMOTIONS } from "@/lib/emotions";
import { ContextoId } from "@/lib/contexts";
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
  entorno: ContextoId;
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
  /** audífonos puestos (Calle, 4.3) */
  audifonos: boolean;
  /** límite frontal del área caminable */
  zMin: number;
  onSuelo: (x: number, z: number) => void;
  onNpc: (id: string) => void;
  onOrbeLlega: () => void;
  /** se dispara cuando el personaje termina de caminar hasta su destino */
  onLlegada: () => void;
}

const DIST_BASE = 11.6; // distancia de cámara en escritorio

// Ajusta la cámara para que todo el contenido quepa en cualquier proporción
// de pantalla (celular vertical, tablet, escritorio).
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

  // La posición inicial se fija UNA sola vez; el desplazamiento es exclusivamente
  // imperativo en useFrame. Si se pasara `objetivo` como prop de posición, R3F
  // teletransportaría al personaje en cada toque y la caminata nunca se vería.
  const posicionInicial = useRef<[number, number, number]>([objetivo[0], 0, objetivo[1]]);

  return (
    <group ref={jugadorRef} position={posicionInicial.current}>
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

// ---------- NPC con desplazamiento suave (la Calle "se siente en movimiento", 4.3) ----------

function NpcAnimado({
  npc,
  emocion,
  factorEtiqueta,
  onNpc,
}: {
  npc: Npc3D;
  emocion: EmotionId | undefined;
  factorEtiqueta: number;
  onNpc: (id: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const posicionInicial = useRef<[number, number, number]>([npc.pos[0], 0, npc.pos[1]]);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    // deriva con calma hacia su posición objetivo cuando esta cambia
    g.position.x = THREE.MathUtils.damp(g.position.x, npc.pos[0], 1.6, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, npc.pos[1], 1.6, delta);
  });

  return (
    <group
      ref={ref}
      position={posicionInicial.current}
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
}

// ---------- orbe de emoción que viaja a la guatita (3.3) ----------

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

// ---------- piso clickeable compartido ----------

function Piso({
  color,
  escalaX,
  zMin,
  onSuelo,
}: {
  color: string;
  escalaX: number;
  zMin: number;
  onSuelo: (x: number, z: number) => void;
}) {
  const limiteX = 6.2 * escalaX;

  function clickPiso(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSuelo(
      THREE.MathUtils.clamp(e.point.x, -limiteX, limiteX),
      THREE.MathUtils.clamp(e.point.z, zMin, 4.4)
    );
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={clickPiso} receiveShadow>
      <planeGeometry args={[14, 10]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// ---------- ambientes ----------

function SalaAmbiente({ escalaX }: { escalaX: number }) {
  return (
    <group>
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
          <Mesa key={i} x={x * escalaX} z={z} />
        )
      )}
    </group>
  );
}

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

function CasaAmbiente({ escalaX }: { escalaX: number }) {
  return (
    <group>
      {/* muros del living */}
      <mesh position={[0, 2.2, -5]}>
        <planeGeometry args={[14, 4.4]} />
        <meshStandardMaterial color="#f3e3c3" />
      </mesh>
      <mesh position={[-7, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#efd9b0" />
      </mesh>
      <mesh position={[7, 2.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 4.4]} />
        <meshStandardMaterial color="#efd9b0" />
      </mesh>
      {/* ventana con cortinas */}
      <mesh position={[3.4 * escalaX, 2.5, -4.95]}>
        <boxGeometry args={[2 * escalaX, 1.5, 0.06]} />
        <meshStandardMaterial color="#dff2ff" emissive="#dff2ff" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[(3.4 - 1.15) * escalaX, 2.5, -4.92]}>
        <boxGeometry args={[0.4 * escalaX, 1.7, 0.05]} />
        <meshStandardMaterial color="#d98f7e" />
      </mesh>
      <mesh position={[(3.4 + 1.15) * escalaX, 2.5, -4.92]}>
        <boxGeometry args={[0.4 * escalaX, 1.7, 0.05]} />
        <meshStandardMaterial color="#d98f7e" />
      </mesh>
      {/* cuadro */}
      <mesh position={[-0.6 * escalaX, 2.6, -4.95]}>
        <boxGeometry args={[1 * escalaX, 0.8, 0.05]} />
        <meshStandardMaterial color="#8fb88a" />
      </mesh>
      {/* sofá */}
      <group position={[-3.8 * escalaX, 0, -3.6]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[2.6 * escalaX, 0.7, 1.1]} />
          <meshStandardMaterial color="#c97b63" flatShading />
        </mesh>
        <mesh position={[0, 0.85, -0.45]}>
          <boxGeometry args={[2.6 * escalaX, 0.8, 0.25]} />
          <meshStandardMaterial color="#b86a52" flatShading />
        </mesh>
      </group>
      {/* TV sobre mueble */}
      <group position={[1.2 * escalaX, 0, -4.3]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.8 * escalaX, 0.7, 0.5]} />
          <meshStandardMaterial color="#9a7448" flatShading />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[1.5 * escalaX, 0.9, 0.1]} />
          <meshStandardMaterial color="#2f2f2f" emissive="#4a6e8a" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {/* alfombra y mesa de centro */}
      <mesh position={[0, 0.01, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.2 * escalaX, 24]} />
        <meshStandardMaterial color="#e8a4a4" />
      </mesh>
      <Mesa x={2.8 * escalaX} z={2.6} />
    </group>
  );
}

// auto que cruza la calzada periódicamente (4.3: animación periódica ~10 s)
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
    g.position.x = direccion * (-20 + ciclo * 40);
  });
  return (
    <group ref={ref} position={[direccion * -20, 0, z]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.7, 0.5, 0.85]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.8]} />
        <meshStandardMaterial color="#dff2ff" flatShading />
      </mesh>
      {([[-0.55, 0.32], [0.55, 0.32], [-0.55, -0.32], [0.55, -0.32]] as [number, number][]).map(
        ([px, pz], i) => (
          <mesh key={i} position={[px, 0.18, pz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.12, 10]} />
            <meshStandardMaterial color="#2c2c2c" flatShading />
          </mesh>
        )
      )}
    </group>
  );
}

function CalleAmbiente({ escalaX }: { escalaX: number }) {
  return (
    <group>
      {/* calzada sobre el piso (el niño no camina aquí: zMin lo impide) */}
      <mesh position={[0, 0.005, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 4.4]} />
        <meshStandardMaterial color="#5d5d61" />
      </mesh>
      {/* demarcación central */}
      {[-6, -4, -2, 0, 2, 4, 6].map((x) => (
        <mesh key={x} position={[x, 0.01, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.16]} />
          <meshStandardMaterial color="#f2f2f2" />
        </mesh>
      ))}
      {/* solera */}
      <mesh position={[0, 0.08, -0.35]}>
        <boxGeometry args={[14, 0.16, 0.18]} />
        <meshStandardMaterial color="#b9b2a6" flatShading />
      </mesh>
      {/* edificios al fondo */}
      {(
        [
          [-4.6, 3.4, "#d98f7e"],
          [0, 4.2, "#9fb4c7"],
          [4.6, 3, "#c9b878"],
        ] as [number, number, string][]
      ).map(([x, alto, color], i) => (
        <group key={i} position={[x * escalaX, 0, -5.4]}>
          <mesh position={[0, alto / 2, 0]}>
            <boxGeometry args={[3.6 * escalaX, alto, 1]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {[0.8, 1.8, 2.6].map(
            (y) =>
              y < alto - 0.4 && (
                <mesh key={y} position={[0, y, 0.51]}>
                  <boxGeometry args={[2.4 * escalaX, 0.45, 0.04]} />
                  <meshStandardMaterial color="#fdf3c9" emissive="#fdf3c9" emissiveIntensity={0.4} />
                </mesh>
              )
          )}
        </group>
      ))}
      {/* poste de luz */}
      <group position={[-6.2 * escalaX, 0, -0.1]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
          <meshStandardMaterial color="#6b6b6b" flatShading />
        </mesh>
        <mesh position={[0, 3.05, 0]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color="#fdf3c9" emissive="#fdf3c9" emissiveIntensity={0.8} />
        </mesh>
      </group>
      {/* árbol */}
      <group position={[6.1 * escalaX, 0, 0.6]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 1.4, 8]} />
          <meshStandardMaterial color="#8a6240" flatShading />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.75, 10, 10]} />
          <meshStandardMaterial color="#6fae7d" flatShading />
        </mesh>
      </group>
      {/* autos cruzando: el escenario se siente en movimiento (4.3) */}
      <Auto z={-1.6} color="#c4584f" direccion={1} periodo={9} desfase={0} />
      <Auto z={-3.4} color="#4a7dd6" direccion={-1} periodo={12} desfase={5} />
    </group>
  );
}

const COLOR_PISO: Record<ContextoId, string> = {
  escuela: "#dcc89f",
  casa: "#d9b38c",
  calle: "#cdc6ba",
};

// ---------- escena completa ----------

export default function ContextScene({
  entorno,
  avatar,
  charge,
  abrumado,
  npcs,
  burbujas,
  objetivo,
  orbe,
  escalaX,
  animacionEjercicio,
  audifonos,
  zMin,
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

      <Piso color={COLOR_PISO[entorno]} escalaX={escalaX} zMin={zMin} onSuelo={onSuelo} />
      {entorno === "escuela" && <SalaAmbiente escalaX={escalaX} />}
      {entorno === "casa" && <CasaAmbiente escalaX={escalaX} />}
      {entorno === "calle" && <CalleAmbiente escalaX={escalaX} />}

      {npcs.map((npc) => (
        <NpcAnimado
          key={npc.id}
          npc={npc}
          emocion={burbujas[npc.id]}
          factorEtiqueta={factorEtiqueta}
          onNpc={onNpc}
        />
      ))}

      <Jugador
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
