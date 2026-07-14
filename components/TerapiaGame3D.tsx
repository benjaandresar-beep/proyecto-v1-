"use client";

// Contexto Terapia explorable: patio con reja → recepción (pacientes + el
// psicólogo de apoyo) → tres salas (Psicología, Fonoaudiología, Terapia
// Ocupacional), cada una con su terapeuta. El psicólogo y las/los terapeutas
// son figuras de apoyo: ayudan a calmar y ofrecen respirar juntos.

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Npc3D, Orbe } from "@/components/three/TerapiaScene";
import {
  TERAPIA_AREAS,
  TerapiaArea,
  PuertaDef,
  PACIENTES,
  FAMILIAR,
  PSICOLOGO,
  TERAPEUTAS,
  LINEAS_TERAPIA,
  BURBUJAS_RECEPCION,
  PersonajeTerapia,
} from "@/lib/terapia";
import { elegirLinea } from "@/lib/dialogos";
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

const TerapiaScene = dynamic(() => import("@/components/three/TerapiaScene"), { ssr: false });

// posiciones por área
const POS_RECEPCION: Record<string, [number, number]> = {
  psicologo: [0, -2.4],
  benja: [-3.2, 0.8],
  flor: [3.2, 1],
  tin: [-1.4, 1.8],
  sol: [1.6, -0.4],
  fam: [4.8, 2.4],
};
const POS_SALA: Record<TerapiaArea, [number, number]> = {
  patio: [0, 0],
  recepcion: [0, 0],
  psicologia: [1, -1.4],
  fonoaudiologia: [1.6, -1],
  "terapia-ocupacional": [0.4, -0.6],
};

const PACIENTE_IDS = PACIENTES.map((p) => p.id);

function aNpc3D(p: PersonajeTerapia, pos: [number, number]): Npc3D {
  return {
    id: p.id,
    nombre: p.nombre,
    piel: p.piel,
    pelo: p.peloEstilo,
    colorPelo: p.colorPelo,
    polera: p.polera,
    pos,
    esAdulto: p.esAdulto,
  };
}

// índice de todos los personajes por id (para datos de apoyo)
const PERSONAJES: Record<string, PersonajeTerapia> = {
  [PSICOLOGO.id]: PSICOLOGO,
  [FAMILIAR.id]: FAMILIAR,
  ...Object.fromEntries(PACIENTES.map((p) => [p.id, p])),
  ...Object.fromEntries(Object.values(TERAPEUTAS).map((t) => [t.id, t])),
};

type FiguraActual = { nombre: string; rol: string; frasePresencia: string };

type Dialogo =
  | { tipo: "npc"; npcId: string; nombre: string; emocion: EmotionId; linea: string }
  | { tipo: "figura-apertura" }
  | { tipo: "herramientas" }
  | { tipo: "puente"; ejercicio: Exercise };

type Crisis = "no" | "respirando" | "mensaje";

export default function TerapiaGame3D() {
  const [avatar] = useState(() => storage.getAvatar());
  const [clinico] = useState(() => storage.getClinical());

  const ejerciciosActivos = useMemo(() => {
    const delSet = EXERCISE_LIBRARY.filter((e) => clinico.ejercicios.includes(e.id));
    // la terapia no fija contexto en la biblioteca; se ofrece todo el set
    return delSet;
  }, [clinico]);

  const [areaId, setAreaId] = useState<TerapiaArea>("patio");
  const area = TERAPIA_AREAS[areaId];

  const [carga, setCarga] = useState<ChargeMap>({});
  const [burbujas, setBurbujas] = useState<Record<string, EmotionId | undefined>>(BURBUJAS_RECEPCION);
  const [objetivo, setObjetivo] = useState<[number, number]>([0, 3.4]);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [figuraActual, setFiguraActual] = useState<FiguraActual>({
    nombre: PSICOLOGO.nombre,
    rol: PSICOLOGO.rol!,
    frasePresencia: PSICOLOGO.frasePresencia!,
  });
  const [crisis, setCrisis] = useState<Crisis>("no");
  const [faseRespiracion, setFaseRespiracion] = useState<"inhala" | "exhala">("inhala");
  const [nubes, setNubes] = useState(false);
  const [respira, setRespira] = useState(false);
  const [ruido, setRuido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [orbe, setOrbe] = useState<(Orbe & { emocion: EmotionId; nombre: string }) | null>(null);
  const [animEjercicio, setAnimEjercicio] = useState<Exercise | null>(null);
  const [puertaPrompt, setPuertaPrompt] = useState<PuertaDef | null>(null);
  const [puertaAbriendo, setPuertaAbriendo] = useState<string | null>(null);
  const [transicion, setTransicion] = useState(false);

  const ultimaInteraccion = useRef(Date.now());
  const ocupadoRef = useRef(false);
  const alLlegarRef = useRef<(() => void) | null>(null);
  const areaRef = useRef<TerapiaArea>(areaId);
  areaRef.current = areaId;

  const total = totalCharge(carga);
  const abrumado = total >= 75;
  ocupadoRef.current =
    dialogo !== null ||
    nubes ||
    respira ||
    crisis !== "no" ||
    animEjercicio !== null ||
    transicion ||
    puertaPrompt !== null;

  const npcs3d = useMemo<Npc3D[]>(() => {
    if (areaId === "recepcion") {
      return [
        aNpc3D(PSICOLOGO, POS_RECEPCION.psicologo),
        aNpc3D(FAMILIAR, POS_RECEPCION.fam),
        ...PACIENTES.map((p) => aNpc3D(p, POS_RECEPCION[p.id])),
      ];
    }
    if (areaId === "psicologia" || areaId === "fonoaudiologia" || areaId === "terapia-ocupacional") {
      return [aNpc3D(TERAPEUTAS[areaId], POS_SALA[areaId])];
    }
    return [];
  }, [areaId]);

  useEffect(() => {
    const p = storage.getProgress();
    storage.setProgress({ ...p, sesiones: p.sesiones + 1 });
  }, []);

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

  useEffect(() => {
    const intervaloMs = clinico.intervaloEventosSeg * 1000;
    const reloj = setInterval(() => {
      if (ocupadoRef.current || areaRef.current !== "recepcion") return;
      if (Date.now() - ultimaInteraccion.current >= intervaloMs) {
        ultimaInteraccion.current = Date.now();
        setBurbujas((prev) => {
          const emociones = Object.values(prev).filter(Boolean) as EmotionId[];
          const ids = [...PACIENTE_IDS].sort(() => Math.random() - 0.5);
          const nuevas: Record<string, EmotionId | undefined> = {};
          emociones.forEach((e, i) => {
            if (ids[i]) nuevas[ids[i]] = e;
          });
          return nuevas;
        });
      }
    }, 1000);
    const ruidoTimer = setInterval(() => {
      if (ocupadoRef.current) return;
      setRuido(true);
      setTimeout(() => setRuido(false), 1100);
      setCarga((c) => sumarCarga(c, "miedo", CARGA_RUIDO));
      setAviso("Sonó algo fuerte en la sala. Tu cuerpo lo sintió.");
      setTimeout(() => setAviso(null), 3000);
    }, intervaloMs * 1.5);
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
    const persona = PERSONAJES[id];
    setObjetivo([Math.max(-6, Math.min(6, npc.pos[0] + 0.9)), Math.min(npc.pos[1] + 0.7, 4)]);
    const emocion = burbujas[id];
    alLlegarRef.current = () => {
      if (persona?.esApoyo) {
        setFiguraActual({
          nombre: persona.nombre,
          rol: persona.rol!,
          frasePresencia: persona.frasePresencia!,
        });
        setDialogo({ tipo: "figura-apertura" });
      } else if (emocion) {
        setDialogo({
          tipo: "npc",
          npcId: id,
          nombre: npc.nombre,
          emocion,
          linea: elegirLinea(LINEAS_TERAPIA, emocion, "terapia"),
        });
      } else if (persona?.esAdulto) {
        setAviso(`${npc.nombre} espera tranquila y te sonríe.`);
        setTimeout(() => setAviso(null), 2500);
      } else {
        setAviso(`${npc.nombre} dice: «¡Hola! ¿También vienes a terapia?»`);
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
      const dest = TERAPIA_AREAS[p.destino];
      setAreaId(dest.id);
      setObjetivo(dest.entrada);
      setPuertaAbriendo(null);
    }, 650);
    setTimeout(() => setTransicion(false), 1050);
  }

  function llegoAlDestino() {
    const accion = alLlegarRef.current;
    alLlegarRef.current = null;
    accion?.();
  }

  function escucharNpc(npcId: string, nombre: string, emocion: EmotionId) {
    setDialogo(null);
    setBurbujas((b) => ({ ...b, [npcId]: undefined }));
    setTimeout(() => {
      setBurbujas((prev) => {
        const libres = PACIENTE_IDS.filter((id) => !prev[id]);
        if (libres.length === 0) return prev;
        const elegido = libres[Math.floor(Math.random() * libres.length)];
        const pool: EmotionId[] =
          Math.random() < 0.55 ? DISPLACENTERAS : (["alegria", "calma"] as EmotionId[]);
        return { ...prev, [elegido]: pool[Math.floor(Math.random() * pool.length)] };
      });
    }, RESPAWN_BURBUJA_MS);

    const info = EMOTIONS[emocion];
    if (info.displacentera) {
      const pos = POS_RECEPCION[npcId];
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
        `Hablar con ${figuraActual.rol} sobre lo que pasa ahora te ayudó mucho. Tu cuerpo aún siente un poquito: ahora puedes usar tus herramientas.`
      );
      setTimeout(() => setAviso(null), 4500);
    }, 2800);
  }

  function respirarJuntos() {
    setDialogo(null);
    setRespira(true);
    setTimeout(() => {
      setRespira(false);
      setCarga((c) => reducirTotal(c, 22));
      setAviso("Respirar juntos ayudó a tu cuerpo a volver a la calma. 💙");
      setTimeout(() => setAviso(null), 3500);
    }, 8000);
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
    <div className="escena-envoltorio">
      <TerapiaScene
        area={area}
        avatar={avatar}
        charge={carga}
        abrumado={abrumado}
        animacionEjercicio={animEjercicio?.animacion ?? null}
        npcs={npcs3d}
        burbujas={burbujas}
        objetivo={objetivo}
        orbe={orbe}
        mostrarEtiquetas={mostrarEtiquetas}
        puertaAbriendo={puertaAbriendo}
        onSuelo={tocarSuelo}
        onNpc={tocarNpc}
        onPuerta={tocarPuerta}
        onOrbeLlega={llegoOrbe}
        onLlegada={llegoAlDestino}
      />

      <Link href="/" className="salir-enlace">
        ← Salir
      </Link>

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
      </div>

      {abrumado && crisis === "no" && !aviso && (
        <div className="aviso-carga">
          Tu guatita está muy llena… ¿probamos una herramienta o buscamos al psicólogo?
        </div>
      )}
      {aviso && (
        <div className="aviso-carga" style={{ borderColor: "var(--acento)", color: "var(--tinta)" }}>
          {aviso}
        </div>
      )}

      {ruido && <div className="ruido-fuerte">🔔 ¡SONÓ FUERTE!</div>}

      {animEjercicio && (
        <div className="banner-ejercicio">
          <span style={{ fontSize: "1.8rem" }}>{animEjercicio.emoji}</span>
          <span>
            Tu personaje está haciendo: <strong>{animEjercicio.nombre}</strong>…
          </span>
        </div>
      )}

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

      {dialogo?.tipo === "npc" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">{dialogo.nombre}</span>
            <p className="dialogo-texto">«{dialogo.linea}»</p>
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
            <span className="dialogo-hablante">{figuraActual.nombre}</span>
            <p className="dialogo-texto">
              «Hola. Respira conmigo y cuéntame qué está pasando ahora.»
            </p>
            <button className="boton" onClick={respirarJuntos}>
              🌬️ Respirar juntos
            </button>
            {emocionesAcumuladas.map((id) => (
              <button
                key={id}
                className="opcion-coloreada"
                style={{ background: EMOTIONS[id].color }}
                onClick={() => contarALaFigura(id)}
              >
                «Siento {EMOTIONS[id].nombre} y te quiero contar…»
              </button>
            ))}
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
            Conversando con {figuraActual.nombre}…
          </p>
        </div>
      )}

      {respira && (
        <div className="nubes" style={{ flexDirection: "column", gap: 22, padding: 24 }}>
          <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "#4a6e8a", textAlign: "center", margin: 0 }}>
            Respira con el círculo: inhala cuando crece, exhala cuando se achica.
          </p>
          <div className="respiracion-circulo" />
          <p style={{ color: "#4a6e8a", fontWeight: 700, margin: 0 }}>{figuraActual.nombre} respira contigo 💙</p>
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
                {figuraActual.frasePresencia} Respiremos juntos.
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
                La próxima vez puedes usar tus herramientas un poquito antes, o pedirle ayuda al
                psicólogo.
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
