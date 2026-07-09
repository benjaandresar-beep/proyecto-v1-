"use client";

// Contexto Casa explorable: casa de un piso con living, patio, pasillos y
// habitaciones conectados por puertas que se abren. Mantiene la mecánica de
// regulación (carga, burbujas, reguladores, figura de apoyo, crisis) en el
// living, y añade exploración: alimentar al perro en el patio y recoger los
// audífonos en tu pieza.
// El patio tiene un sub-contexto: una fiesta tipo asado con invitados que
// traen sus propias emociones (más gente y más estímulos que el living).

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Npc3D, Orbe } from "@/components/three/CasaScene";
import {
  BURBUJAS_FIESTA,
  CASA_AREAS,
  CasaArea,
  INVITADOS_FIESTA,
  LINEAS_FIESTA,
  PuertaDef,
} from "@/lib/casa";
import { CONTEXTOS } from "@/lib/contexts";
import {
  ChargeMap,
  CHARGE_MAX,
  DISPLACENTERAS,
  EmotionId,
  EMOTIONS,
  totalCharge,
} from "@/lib/emotions";
import { Exercise, EXERCISE_LIBRARY } from "@/lib/exercises";
import {
  ALIVIO_AMIGO_CALMA,
  ALIVIO_EJERCICIO,
  CARGA_POR_BURBUJA,
  CARGA_RUIDO,
  escalarA,
  reducirTotal,
  RESPAWN_BURBUJA_MS,
  sumarCarga,
} from "@/lib/school";
import { storage } from "@/lib/storage";

const CasaScene = dynamic(() => import("@/components/three/CasaScene"), { ssr: false });

const CASA = CONTEXTOS.casa;
const FIGURA = CASA.figura; // Mamá Andrea

// familia en el living, con sus posiciones
const FAMILIA_IDS = ["pedro", "carla", "nico"];
const POS_LIVING: Record<string, [number, number]> = {
  pedro: [-2.2, -1],
  carla: [2.4, -0.6],
  nico: [0.6, 0.6],
  [FIGURA.id]: [-0.6, -2.6],
};
const BURBUJAS_LIVING: Record<string, EmotionId> = {
  pedro: "enojo",
  carla: "tristeza",
  nico: "alegria",
};

// invitados del asado en el patio (sub-contexto fiesta)
const INVITADOS_IDS = INVITADOS_FIESTA.map((i) => i.id);
const POS_FIESTA: Record<string, [number, number]> = Object.fromEntries(
  INVITADOS_FIESTA.map((i) => [i.id, i.pos] as [string, [number, number]])
);

function npcDef(id: string): Npc3D {
  const base = id === FIGURA.id ? FIGURA : CASA.npcs.find((n) => n.id === id)!;
  return {
    id: base.id,
    nombre: base.nombre,
    piel: base.piel,
    pelo: base.peloEstilo,
    colorPelo: base.colorPelo,
    polera: base.polera,
    pos: POS_LIVING[id],
    esAdulto: id === FIGURA.id,
  };
}

type Dialogo =
  | { tipo: "npc"; npcId: string; nombre: string; emocion: EmotionId }
  | { tipo: "figura-apertura" }
  | { tipo: "herramientas" }
  | { tipo: "puente"; ejercicio: Exercise }
  | { tipo: "perro" }
  | { tipo: "gato" };

type Crisis = "no" | "respirando" | "mensaje";

export default function CasaGame3D() {
  const [avatar] = useState(() => storage.getAvatar());
  const [clinico] = useState(() => storage.getClinical());

  const ejerciciosActivos = useMemo(() => {
    const delSet = EXERCISE_LIBRARY.filter((e) => clinico.ejercicios.includes(e.id));
    const enContexto = delSet.filter((e) => e.contextos.includes("casa"));
    return enContexto.length > 0 ? enContexto : delSet;
  }, [clinico]);

  const [areaId, setAreaId] = useState<CasaArea>("principal");
  const area = CASA_AREAS[areaId];

  const [carga, setCarga] = useState<ChargeMap>({});
  const [burbujas, setBurbujas] = useState<Record<string, EmotionId | undefined>>({
    ...BURBUJAS_LIVING,
    ...BURBUJAS_FIESTA,
  });
  const [objetivo, setObjetivo] = useState<[number, number]>([0, 3.2]);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [crisis, setCrisis] = useState<Crisis>("no");
  const [faseRespiracion, setFaseRespiracion] = useState<"inhala" | "exhala">("inhala");
  const [nubes, setNubes] = useState(false);
  const [ruido, setRuido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [orbe, setOrbe] = useState<(Orbe & { emocion: EmotionId; nombre: string }) | null>(null);
  const [animEjercicio, setAnimEjercicio] = useState<Exercise | null>(null);
  const [audifonos, setAudifonos] = useState(false);
  const [tieneAudifonos, setTieneAudifonos] = useState(false);
  const [perroAlimentado, setPerroAlimentado] = useState(false);
  const [gatoAlimentado, setGatoAlimentado] = useState(false);
  // navegación de puertas
  const [puertaPrompt, setPuertaPrompt] = useState<PuertaDef | null>(null);
  const [puertaAbriendo, setPuertaAbriendo] = useState<string | null>(null);
  const [transicion, setTransicion] = useState(false);

  const ultimaInteraccion = useRef(Date.now());
  const ocupadoRef = useRef(false);
  const fiestaAvisadaRef = useRef(false);
  const alLlegarRef = useRef<(() => void) | null>(null);
  const audifonosRef = useRef(false);
  audifonosRef.current = audifonos;
  const areaRef = useRef<CasaArea>(areaId);
  areaRef.current = areaId;

  const total = totalCharge(carga);
  const abrumado = total >= 75;
  ocupadoRef.current =
    dialogo !== null || nubes || crisis !== "no" || animEjercicio !== null || transicion || puertaPrompt !== null;

  const npcs3d = useMemo<Npc3D[]>(() => {
    if (areaId === "principal") return [...FAMILIA_IDS, FIGURA.id].map(npcDef);
    if (areaId === "patio")
      return INVITADOS_FIESTA.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        piel: i.piel,
        pelo: i.peloEstilo,
        colorPelo: i.colorPelo,
        polera: i.polera,
        pos: i.pos,
        esAdulto: i.esAdulto,
      }));
    return [];
  }, [areaId]);

  const rol = FIGURA.rolCorto;

  useEffect(() => {
    const p = storage.getProgress();
    storage.setProgress({ ...p, sesiones: p.sesiones + 1 });
  }, []);

  // Crisis (3.6)
  useEffect(() => {
    if (total >= CHARGE_MAX && crisis === "no") {
      setDialogo(null);
      setCrisis("respirando");
      const p = storage.getProgress();
      storage.setProgress({ ...p, crisisVividas: p.crisisVividas + 1 });
    }
  }, [total, crisis]);

  useEffect(() => {
    if (crisis !== "respirando") return;
    setFaseRespiracion("inhala");
    let ciclos = 0;
    const t = setInterval(() => {
      setFaseRespiracion((f) => {
        if (f === "inhala") return "exhala";
        ciclos += 1;
        if (ciclos >= 3) {
          clearInterval(t);
          setCrisis("mensaje");
        }
        return "inhala";
      });
    }, 4000);
    return () => clearInterval(t);
  }, [crisis]);

  // Migración de burbujas (living y fiesta del patio) + ruido doméstico periódico
  useEffect(() => {
    const intervaloMs = clinico.intervaloEventosSeg * 1000;

    const reloj = setInterval(() => {
      const grupo =
        areaRef.current === "principal"
          ? FAMILIA_IDS
          : areaRef.current === "patio"
            ? INVITADOS_IDS
            : null;
      if (ocupadoRef.current || !grupo) return;
      if (Date.now() - ultimaInteraccion.current >= intervaloMs) {
        ultimaInteraccion.current = Date.now();
        setBurbujas((prev) => {
          const emociones = grupo.map((id) => prev[id]).filter(Boolean) as EmotionId[];
          const orden = [...grupo].sort(() => Math.random() - 0.5);
          const nuevas = { ...prev };
          grupo.forEach((id) => {
            nuevas[id] = undefined;
          });
          emociones.forEach((e, i) => {
            if (orden[i]) nuevas[orden[i]] = e;
          });
          return nuevas;
        });
      }
    }, 1000);

    const ruidoTimer = setInterval(() => {
      if (ocupadoRef.current) return;
      setRuido(true);
      setTimeout(() => setRuido(false), 1200);
      const protegido = audifonosRef.current;
      const enFiesta = areaRef.current === "patio";
      setCarga((c) => sumarCarga(c, "miedo", protegido ? CARGA_RUIDO / 2 : CARGA_RUIDO));
      setAviso(
        protegido
          ? enFiesta
            ? "¡La música de la fiesta sonó fuerte! Los audífonos te protegieron un poco. 🎧"
            : "¡Ruido en la casa! Los audífonos te protegieron un poco. 🎧"
          : enFiesta
            ? "¡La música de la fiesta sonó muy fuerte! Tu cuerpo lo sintió."
            : "¡La casa se puso ruidosa de repente! Tu cuerpo lo sintió."
      );
      setTimeout(() => setAviso(null), 3000);
    }, intervaloMs);

    return () => {
      clearInterval(reloj);
      clearInterval(ruidoTimer);
    };
  }, [clinico.intervaloEventosSeg]);

  const marcarInteraccion = () => {
    ultimaInteraccion.current = Date.now();
  };

  // ---------- interacciones ----------

  function tocarSuelo(x: number, z: number) {
    if (ocupadoRef.current) return;
    alLlegarRef.current = null;
    setObjetivo([x, z]);
    marcarInteraccion();
  }

  function tocarNpc(id: string) {
    if (ocupadoRef.current) return;
    marcarInteraccion();
    const npc = npcs3d.find((n) => n.id === id)!;
    setObjetivo([Math.max(-6, Math.min(6, npc.pos[0] + 0.9)), Math.min(npc.pos[1] + 0.7, 4)]);
    const emocion = burbujas[id];
    alLlegarRef.current = () => {
      if (id === FIGURA.id) setDialogo({ tipo: "figura-apertura" });
      else if (emocion) setDialogo({ tipo: "npc", npcId: id, nombre: npc.nombre, emocion });
      else {
        setAviso(`${npc.nombre} dice: «¡Hola! ¿Cómo estás hoy?»`);
        setTimeout(() => setAviso(null), 2500);
      }
    };
  }

  function tocarPuerta(p: PuertaDef) {
    if (ocupadoRef.current) return;
    marcarInteraccion();
    setObjetivo(p.aprox);
    alLlegarRef.current = () => setPuertaPrompt(p);
  }

  function abrirPuerta() {
    const p = puertaPrompt;
    if (!p) return;
    setPuertaPrompt(null);
    setPuertaAbriendo(p.id);
    setTransicion(true);
    setTimeout(() => {
      const dest = CASA_AREAS[p.destino];
      setAreaId(dest.id);
      setObjetivo(dest.entrada);
      setPuertaAbriendo(null);
      if (dest.id === "patio" && !fiestaAvisadaRef.current) {
        fiestaAvisadaRef.current = true;
        setAviso("🎉 ¡Hay un asado en el patio! Saluda a los invitados y mira cómo se sienten.");
        setTimeout(() => setAviso(null), 4500);
      }
    }, 650);
    setTimeout(() => setTransicion(false), 1050);
  }

  function tocarMascota(cual: "perro" | "gato") {
    if (ocupadoRef.current) return;
    marcarInteraccion();
    if (cual === "perro") {
      setObjetivo([-3.9, -0.6]);
      alLlegarRef.current = () => setDialogo({ tipo: "perro" });
    } else {
      setObjetivo([-4.7, 1.9]);
      alLlegarRef.current = () => setDialogo({ tipo: "gato" });
    }
  }

  function alimentarPerro() {
    setDialogo(null);
    setPerroAlimentado(true);
    setCarga((c) => reducirTotal(c, 6)); // cuidar a la mascota calma un poco
    setAviso("Le serviste comida. ¡Firulais mueve la cola feliz! 🐶🦴");
    setTimeout(() => setAviso(null), 3500);
  }

  function alimentarGato() {
    setDialogo(null);
    setGatoAlimentado(true);
    setCarga((c) => reducirTotal(c, 6));
    setAviso("Le serviste comida. ¡Michi ronronea feliz! 🐱🐟");
    setTimeout(() => setAviso(null), 3500);
  }

  function tocarObjeto(cual: "audifonos") {
    if (cual === "audifonos") {
      if (ocupadoRef.current) return;
      marcarInteraccion();
      setObjetivo([-3.4, 2.4]);
      alLlegarRef.current = () => {
        setTieneAudifonos(true);
        setAudifonos(true);
        setAviso("🎧 ¡Encontraste tus audífonos! Ahora los ruidos fuertes molestarán menos.");
        setTimeout(() => setAviso(null), 3800);
      };
    }
  }

  function llegoAlDestino() {
    const accion = alLlegarRef.current;
    alLlegarRef.current = null;
    accion?.();
  }

  function escucharNpc(npcId: string, nombre: string, emocion: EmotionId) {
    setDialogo(null);
    const grupo = FAMILIA_IDS.includes(npcId) ? FAMILIA_IDS : INVITADOS_IDS;
    setBurbujas((b) => ({ ...b, [npcId]: undefined }));
    setTimeout(() => {
      setBurbujas((prev) => {
        const libres = grupo.filter((id) => !prev[id]);
        if (libres.length === 0) return prev;
        const elegido = libres[Math.floor(Math.random() * libres.length)];
        const pool: EmotionId[] =
          Math.random() < 0.55 ? DISPLACENTERAS : (["alegria", "calma"] as EmotionId[]);
        return { ...prev, [elegido]: pool[Math.floor(Math.random() * pool.length)] };
      });
    }, RESPAWN_BURBUJA_MS);

    const info = EMOTIONS[emocion];
    if (info.displacentera) {
      const pos = POS_LIVING[npcId] ?? POS_FIESTA[npcId];
      setOrbe({ key: Date.now(), color: info.color, desde: [pos[0], 1.8, pos[1]], emocion, nombre });
    } else if (emocion === "calma") {
      setCarga((c) => reducirTotal(c, ALIVIO_AMIGO_CALMA));
      setAviso("Estar con alguien tranquilo ayudó un poquito a tu cuerpo. 💚");
      setTimeout(() => setAviso(null), 3000);
    } else {
      setAviso("¡Qué entretenido! Compartir alegría también es parte del día. 💛");
      setTimeout(() => setAviso(null), 3000);
    }
  }

  function llegoOrbe() {
    if (!orbe) return;
    const info = EMOTIONS[orbe.emocion];
    setCarga((c) => sumarCarga(c, orbe.emocion, CARGA_POR_BURBUJA));
    setAviso(`El ${info.nombre} de ${orbe.nombre} se quedó en tu guatita. ¿Lo sientes ahí?`);
    setTimeout(() => setAviso(null), 3500);
    setOrbe(null);
  }

  function contarALaFigura(emocion: EmotionId) {
    setDialogo(null);
    setNubes(true);
    setTimeout(() => {
      setNubes(false);
      setCarga((c) => {
        const v = c[emocion] ?? 0;
        return { ...c, [emocion]: Math.max(v * 0.3, 4) };
      });
      setAviso(
        `Contarle a ${rol} te ayudó mucho. Tu cuerpo aún siente un poquito, y está bien: ahora puedes usar tus herramientas.`
      );
      setTimeout(() => setAviso(null), 4500);
    }, 2800);
  }

  function hacerEjercicio(ej: Exercise) {
    setDialogo(null);
    setAnimEjercicio(ej);
    setTimeout(() => {
      setAnimEjercicio(null);
      if (ej.estado === "subir") {
        setCarga((c) => reducirTotal(c, ALIVIO_EJERCICIO * 0.4));
        if (totalCharge(carga) >= 60) {
          setAviso(
            "Eso te dio energía, pero tu cuerpo ya estaba muy cargado. Para calmar, prueba respirar o empujar la pared."
          );
          setTimeout(() => setAviso(null), 4000);
        }
      } else {
        setCarga((c) => reducirTotal(c, ALIVIO_EJERCICIO));
      }
      setDialogo({ tipo: "puente", ejercicio: ej });
    }, 3200);
  }

  function responderPuente(ej: Exercise, loHizo: boolean) {
    setDialogo(null);
    if (loHizo) {
      const p = storage.getProgress();
      storage.setProgress({
        ...p,
        hechosEnVidaReal: { ...p.hechosEnVidaReal, [ej.id]: (p.hechosEnVidaReal[ej.id] ?? 0) + 1 },
      });
      setAviso("🌟 ¡Eso! Practicar de verdad hace tu calma más fuerte.");
    } else {
      setAviso("Está bien. Cuando quieras, puedes probarlo: tu cuerpo aprende cuando lo haces de verdad.");
    }
    setTimeout(() => setAviso(null), 3500);
  }

  function salirDeCrisis() {
    setCarga((c) => escalarA(c, 50));
    setCrisis("no");
    marcarInteraccion();
  }

  const emocionesAcumuladas = DISPLACENTERAS.filter((id) => (carga[id] ?? 0) >= 4);
  const mostrarEtiquetas = !ocupadoRef.current;

  // ---------- render ----------

  return (
    <div className="escena-envoltorio escena-casa">
      <CasaScene
        area={area}
        avatar={avatar}
        charge={carga}
        abrumado={abrumado}
        animacionEjercicio={animEjercicio?.animacion ?? null}
        audifonos={audifonos}
        npcs={npcs3d}
        burbujas={burbujas}
        objetivo={objetivo}
        orbe={orbe}
        mostrarEtiquetas={mostrarEtiquetas}
        puertaAbriendo={puertaAbriendo}
        perroAlimentado={perroAlimentado}
        gatoAlimentado={gatoAlimentado}
        onSuelo={tocarSuelo}
        onNpc={tocarNpc}
        onPuerta={tocarPuerta}
        onMascota={tocarMascota}
        onObjeto={tocarObjeto}
        onOrbeLlega={llegoOrbe}
        onLlegada={llegoAlDestino}
      />

      <Link href="/" className="salir-enlace">
        ← Salir
      </Link>

      {/* nombre del área actual */}
      <div className="area-rotulo">{area.nombre}</div>

      <div className="hud">
        <button
          className="hud-boton"
          onClick={() => {
            if (!ocupadoRef.current) {
              marcarInteraccion();
              setDialogo({ tipo: "herramientas" });
            }
          }}
        >
          🧰 Mis herramientas
        </button>
        {tieneAudifonos && (
          <button
            className="hud-boton"
            style={audifonos ? { background: "var(--verde)", color: "white" } : undefined}
            onClick={() => {
              setAudifonos((a) => !a);
              setAviso(audifonos ? "Te quitaste los audífonos." : "🎧 Audífonos puestos.");
              setTimeout(() => setAviso(null), 2500);
            }}
          >
            🎧 {audifonos ? "✓" : ""}
          </button>
        )}
      </div>

      {abrumado && crisis === "no" && !aviso && (
        <div className="aviso-carga">
          Tu guatita está muy llena… ¿probamos una herramienta o le contamos a {rol}?
        </div>
      )}
      {aviso && (
        <div className="aviso-carga" style={{ borderColor: "var(--acento)", color: "var(--tinta)" }}>
          {aviso}
        </div>
      )}

      {ruido && (
        <div className="ruido-fuerte">
          {areaId === "patio" ? "🎶 ¡MÚSICA FUERTE!" : "📺 ¡RUIDO EN CASA!"}
        </div>
      )}

      {animEjercicio && (
        <div className="banner-ejercicio">
          <span style={{ fontSize: "1.8rem" }}>{animEjercicio.emoji}</span>
          <span>
            Tu personaje está haciendo: <strong>{animEjercicio.nombre}</strong>…
          </span>
        </div>
      )}

      {/* prompt de abrir puerta */}
      {puertaPrompt && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">🚪 Puerta</span>
            <p className="dialogo-texto">¿Quieres abrir la puerta?</p>
            <button className="boton verde" onClick={abrirPuerta}>
              Abrir → {puertaPrompt.label}
            </button>
            <button className="boton secundario" onClick={() => setPuertaPrompt(null)}>
              Ahora no
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "perro" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">🐶 Firulais</span>
            <p className="dialogo-texto">«¡Guau, guau!»</p>
            {!perroAlimentado ? (
              <button className="boton verde" onClick={alimentarPerro}>
                🦴 Alimentar al perro
              </button>
            ) : (
              <p style={{ color: "var(--tinta-suave)", margin: 0 }}>
                Firulais ya comió y está feliz, moviendo la cola.
              </p>
            )}
            <button className="boton secundario" onClick={() => setDialogo(null)}>
              Volver
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "gato" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">🐱 Michi</span>
            <p className="dialogo-texto">«¡Miau!»</p>
            {!gatoAlimentado ? (
              <button className="boton verde" onClick={alimentarGato}>
                🐟 Alimentar al gato
              </button>
            ) : (
              <p style={{ color: "var(--tinta-suave)", margin: 0 }}>
                Michi ya comió y ronronea contento.
              </p>
            )}
            <button className="boton secundario" onClick={() => setDialogo(null)}>
              Volver
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "npc" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">{dialogo.nombre}</span>
            <p className="dialogo-texto">
              «{(INVITADOS_IDS.includes(dialogo.npcId) ? LINEAS_FIESTA : CASA.lineas)[dialogo.emocion]}»
            </p>
            <button
              className="opcion-coloreada"
              style={{ background: EMOTIONS[dialogo.emocion].color }}
              onClick={() => escucharNpc(dialogo.npcId, dialogo.nombre, dialogo.emocion)}
            >
              Escuchar a {dialogo.nombre}
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "figura-apertura" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">{FIGURA.nombre}</span>
            <p className="dialogo-texto">«¿En qué te puedo ayudar hoy?»</p>
            {emocionesAcumuladas.length === 0 ? (
              <>
                <p style={{ color: "var(--tinta-suave)", margin: 0 }}>
                  Tu cuerpo está tranquilo ahora mismo.
                </p>
                <button className="boton verde" onClick={() => setDialogo(null)}>
                  «¡Solo quería saludarte!»
                </button>
              </>
            ) : (
              emocionesAcumuladas.map((id) => (
                <button
                  key={id}
                  className="opcion-coloreada"
                  style={{ background: EMOTIONS[id].color }}
                  onClick={() => contarALaFigura(id)}
                >
                  «Siento {EMOTIONS[id].nombre} y te quiero contar…»
                </button>
              ))
            )}
            <button className="boton secundario" onClick={() => setDialogo(null)}>
              Volver
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "herramientas" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">Mis herramientas de calma</span>
            {ejerciciosActivos.length === 0 && (
              <p className="dialogo-texto">
                No hay herramientas configuradas. Pídele a tu terapeuta que active algunas.
              </p>
            )}
            {ejerciciosActivos.map((ej) => (
              <button
                key={ej.id}
                className="boton secundario"
                style={{ textAlign: "left" }}
                onClick={() => hacerEjercicio(ej)}
              >
                {ej.emoji} {ej.nombre}
              </button>
            ))}
            <button className="boton" onClick={() => setDialogo(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "puente" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">El puente a la vida real</span>
            <p className="dialogo-texto">
              Tu personaje hizo <strong>{dialogo.ejercicio.nombre.toLowerCase()}</strong> y su cuerpo
              se siente mejor.
            </p>
            <p className="dialogo-texto" style={{ fontWeight: 700 }}>
              ¿Lo hiciste de verdad tú también?
            </p>
            <p style={{ color: "var(--tinta-suave)", margin: 0, fontSize: "0.95rem" }}>
              {dialogo.ejercicio.instruccion}
            </p>
            <div className="fila-botones">
              <button className="boton verde" onClick={() => responderPuente(dialogo.ejercicio, true)}>
                ¡Sí, lo hice!
              </button>
              <button className="boton secundario" onClick={() => responderPuente(dialogo.ejercicio, false)}>
                Aún no
              </button>
            </div>
          </div>
        </div>
      )}

      {nubes && (
        <div className="nubes">
          <div className="nube" style={{ width: 180, height: 70, left: "12%", top: "22%" }} />
          <div className="nube" style={{ width: 240, height: 90, right: "10%", top: "40%", animationDelay: "0.6s" }} />
          <div className="nube" style={{ width: 150, height: 60, left: "30%", bottom: "18%", animationDelay: "1.1s" }} />
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#4a6e8a", zIndex: 1 }}>
            Conversando con {rol}…
          </p>
        </div>
      )}

      {transicion && (
        <div className="transicion-puerta">
          <p>Abriendo la puerta…</p>
        </div>
      )}

      {crisis !== "no" && (
        <div className="nubes" style={{ flexDirection: "column", gap: 24, padding: 24 }}>
          {crisis === "respirando" ? (
            <>
              <p style={{ fontSize: "1.35rem", fontWeight: 800, color: "#4a6e8a", textAlign: "center", margin: 0 }}>
                Tu cuerpo se llenó demasiado y necesita una pausa.
                <br />
                {FIGURA.frasePresencia} Respiremos juntos.
              </p>
              <div className="respiracion-circulo" />
              <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#357fb0", margin: 0 }}>
                {faseRespiracion === "inhala" ? "Inhala… 🌬️" : "Exhala… 😌"}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4a6e8a", textAlign: "center", maxWidth: 420, margin: 0 }}>
                A veces la carga se llena y el cuerpo necesita parar. No es tu culpa y no estás solo.
                La próxima vez puedes usar tus herramientas un poquito antes, o contarle a {rol} cómo
                te sientes.
              </p>
              <button className="boton verde" style={{ maxWidth: 280 }} onClick={salirDeCrisis}>
                Volver a jugar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
