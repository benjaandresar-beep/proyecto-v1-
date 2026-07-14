"use client";

// Contexto Escuela explorable: sala de clases (regulación con compañeros y
// profe) + patio amplio con cancha, baños, ping pong, palmeras y vóleibol,
// conectados por una puerta que se abre. Mantiene la mecánica de regulación.

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LugarPatio, Npc3D, Orbe } from "@/components/three/EscuelaScene";
import { elegirLinea } from "@/lib/dialogos";
import { ESCUELA_AREAS, EscuelaArea, PuertaDef } from "@/lib/escuela";
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

const EscuelaScene = dynamic(() => import("@/components/three/EscuelaScene"), { ssr: false });

const ESC = CONTEXTOS.escuela;
const FIGURA = ESC.figura; // Profe Carmen
const COMPANERO_IDS = ESC.npcs.map((n) => n.id);

function npcDef(id: string): Npc3D {
  const base = id === FIGURA.id ? FIGURA : ESC.npcs.find((n) => n.id === id)!;
  return {
    id: base.id,
    nombre: base.nombre,
    piel: base.piel,
    pelo: base.peloEstilo,
    colorPelo: base.colorPelo,
    polera: base.polera,
    pos: ESC.posiciones[id],
    esAdulto: id === FIGURA.id,
  };
}

const LUGAR_AVISO: Record<LugarPatio, string> = {
  cancha: "La cancha. Aquí se juega a la pelota en los recreos. 🏀",
  voley: "La cancha de vóleibol. ¿Te animas a un partido? 🏐",
  pingpong: "Las mesas de ping pong. ¡Pim, pam, pim! 🏓",
  banos: "El sector de los baños. Si lo necesitas, puedes ir tranquilo. 🚻",
};

type Dialogo =
  | { tipo: "npc"; npcId: string; nombre: string; emocion: EmotionId; linea: string }
  | { tipo: "figura-apertura" }
  | { tipo: "herramientas" }
  | { tipo: "puente"; ejercicio: Exercise };

type Crisis = "no" | "respirando" | "mensaje";

export default function EscuelaGame3D() {
  const [avatar] = useState(() => storage.getAvatar());
  const [clinico] = useState(() => storage.getClinical());

  const ejerciciosActivos = useMemo(() => {
    const delSet = EXERCISE_LIBRARY.filter((e) => clinico.ejercicios.includes(e.id));
    const enContexto = delSet.filter((e) => e.contextos.includes("escuela"));
    return enContexto.length > 0 ? enContexto : delSet;
  }, [clinico]);

  const [areaId, setAreaId] = useState<EscuelaArea>("sala");
  const area = ESCUELA_AREAS[areaId];

  const [carga, setCarga] = useState<ChargeMap>({});
  const [burbujas, setBurbujas] = useState<Record<string, EmotionId | undefined>>(
    ESC.burbujasIniciales
  );
  const [objetivo, setObjetivo] = useState<[number, number]>([0, 3.2]);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [crisis, setCrisis] = useState<Crisis>("no");
  const [faseRespiracion, setFaseRespiracion] = useState<"inhala" | "exhala">("inhala");
  const [nubes, setNubes] = useState(false);
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
  const areaRef = useRef<EscuelaArea>(areaId);
  areaRef.current = areaId;

  const total = totalCharge(carga);
  const abrumado = total >= 75;
  ocupadoRef.current =
    dialogo !== null || nubes || crisis !== "no" || animEjercicio !== null || transicion || puertaPrompt !== null;

  const npcs3d = useMemo<Npc3D[]>(
    () => (areaId === "sala" ? [...COMPANERO_IDS, FIGURA.id].map(npcDef) : []),
    [areaId]
  );

  const rol = FIGURA.rolCorto;

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
      if (ocupadoRef.current || areaRef.current !== "sala") return;
      if (Date.now() - ultimaInteraccion.current >= intervaloMs) {
        ultimaInteraccion.current = Date.now();
        setBurbujas((prev) => {
          const emociones = Object.values(prev).filter(Boolean) as EmotionId[];
          const ids = [...COMPANERO_IDS].sort(() => Math.random() - 0.5);
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
      setTimeout(() => setRuido(false), 1200);
      setCarga((c) => sumarCarga(c, "miedo", CARGA_RUIDO));
      setAviso("¡Eso fue un ruido fuerte! Tu cuerpo lo sintió.");
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
      else if (emocion)
        setDialogo({
          tipo: "npc",
          npcId: id,
          nombre: npc.nombre,
          emocion,
          linea: elegirLinea(ESC.lineas, emocion, "escuela"),
        });
      else {
        setAviso(`${npc.nombre} dice: «¡Hola! ¿Jugamos en el recreo?»`);
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
      const dest = ESCUELA_AREAS[p.destino];
      setAreaId(dest.id);
      setObjetivo(dest.entrada);
      setPuertaAbriendo(null);
    }, 650);
    setTimeout(() => setTransicion(false), 1050);
  }

  function tocarLugar(l: LugarPatio) {
    if (ocupadoRef.current) return;
    marcarInteraccion();
    setAviso(LUGAR_AVISO[l]);
    setTimeout(() => setAviso(null), 3200);
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
        const libres = COMPANERO_IDS.filter((id) => !prev[id]);
        if (libres.length === 0) return prev;
        const elegido = libres[Math.floor(Math.random() * libres.length)];
        const pool: EmotionId[] =
          Math.random() < 0.55 ? DISPLACENTERAS : (["alegria", "calma"] as EmotionId[]);
        return { ...prev, [elegido]: pool[Math.floor(Math.random() * pool.length)] };
      });
    }, RESPAWN_BURBUJA_MS);

    const info = EMOTIONS[emocion];
    if (info.displacentera) {
      const pos = ESC.posiciones[npcId];
      setOrbe({ key: Date.now(), color: info.color, desde: [pos[0], 1.8, pos[1]], emocion, nombre });
    } else if (emocion === "calma") {
      setCarga((c) => reducirTotal(c, ALIVIO_AMIGO_CALMA));
      setAviso("Estar con un amigo tranquilo ayudó un poquito a tu cuerpo. 💚");
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
    <div className="escena-envoltorio">
      <EscuelaScene
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
        onLugar={tocarLugar}
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
          Tu guatita está muy llena… ¿probamos una herramienta o le contamos a {rol}?
        </div>
      )}
      {aviso && (
        <div className="aviso-carga" style={{ borderColor: "var(--acento)", color: "var(--tinta)" }}>
          {aviso}
        </div>
      )}

      {ruido && <div className="ruido-fuerte">💥 ¡RUIDO FUERTE!</div>}

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
            <span className="dialogo-hablante">{FIGURA.nombre}</span>
            <p className="dialogo-texto">«¿En qué te puedo ayudar hoy?»</p>
            {emocionesAcumuladas.length === 0 ? (
              <>
                <p style={{ color: "var(--tinta-suave)", margin: 0 }}>
                  Tu cuerpo está tranquilo ahora mismo.
                </p>
                <button className="boton verde" onClick={() => setDialogo(null)}>
                  «¡Solo quería saludarte, profe!»
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
