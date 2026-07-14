"use client";

// Contexto Escuela (MVP) — motor de la mecánica central (secciones 3 y 4.1 de la spec):
// burbujas emocionales con migración, acumulación en la guatita (interocepción),
// ruido fuerte periódico, reguladores parciales con puente a la vida real,
// figura de apoyo que baja fuerte pero no a cero, y crisis como pausa guiada de calma.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AvatarSvg, { AvatarMood } from "@/components/AvatarSvg";
import NpcSvg from "@/components/NpcSvg";
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
  BURBUJAS_INICIALES,
  CARGA_POR_BURBUJA,
  CARGA_RUIDO,
  COMPANEROS_BASE,
  escalarA,
  LINEAS_NPC,
  NpcBase,
  PROFE_BASE,
  reducirTotal,
  RESPAWN_BURBUJA_MS,
  sumarCarga,
} from "@/lib/school";
import { elegirLinea } from "@/lib/dialogos";
import { storage } from "@/lib/storage";

// Personajes compartidos (lib/school.ts) + posiciones 2D en porcentaje de la escena
interface NpcDef extends NpcBase {
  x: number;
  y: number;
}

const POSICIONES_2D: Record<string, { x: number; y: number }> = {
  martin: { x: 14, y: 78 },
  sofia: { x: 32, y: 90 },
  tomas: { x: 50, y: 70 },
  emilia: { x: 68, y: 88 },
  lucas: { x: 86, y: 74 },
  maite: { x: 60, y: 60 },
  diego: { x: 8, y: 92 },
  anto: { x: 90, y: 92 },
  profe: { x: 24, y: 58 },
};

const COMPANEROS: NpcDef[] = COMPANEROS_BASE.map((c) => ({ ...c, ...POSICIONES_2D[c.id] }));
const PROFE: NpcDef = { ...PROFE_BASE, ...POSICIONES_2D.profe };

type Dialogo =
  | { tipo: "npc"; npc: NpcDef; emocion: EmotionId; linea: string }
  | { tipo: "profe-apertura" }
  | { tipo: "herramientas" }
  | { tipo: "puente"; ejercicio: Exercise };

type Crisis = "no" | "respirando" | "mensaje";

export default function SchoolGame() {
  const [avatar] = useState(() => storage.getAvatar());
  const [clinico] = useState(() => storage.getClinical());

  const ejerciciosActivos = useMemo(
    () => EXERCISE_LIBRARY.filter((e) => clinico.ejercicios.includes(e.id)),
    [clinico]
  );

  const [carga, setCarga] = useState<ChargeMap>({});
  const [burbujas, setBurbujas] = useState<Record<string, EmotionId | undefined>>(
    BURBUJAS_INICIALES
  );
  const [posJugador, setPosJugador] = useState({ x: 50, y: 95 });
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [crisis, setCrisis] = useState<Crisis>("no");
  const [faseRespiracion, setFaseRespiracion] = useState<"inhala" | "exhala">("inhala");
  const [nubes, setNubes] = useState(false);
  const [ruido, setRuido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [puntoViaje, setPuntoViaje] = useState<{
    color: string;
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const [animEjercicio, setAnimEjercicio] = useState<Exercise | null>(null);

  const ultimaInteraccion = useRef(Date.now());
  const ocupadoRef = useRef(false); // diálogo, nubes o crisis activos

  const total = totalCharge(carga);
  const mood: AvatarMood = total >= 75 ? "abrumado" : total >= 40 ? "cargado" : "ok";
  ocupadoRef.current = dialogo !== null || nubes || crisis !== "no" || animEjercicio !== null;

  // Registrar sesión al entrar
  useEffect(() => {
    const p = storage.getProgress();
    storage.setProgress({ ...p, sesiones: p.sesiones + 1 });
  }, []);

  // Crisis cuando la carga se llena (3.6)
  useEffect(() => {
    if (total >= CHARGE_MAX && crisis === "no") {
      setDialogo(null);
      setCrisis("respirando");
      const p = storage.getProgress();
      storage.setProgress({ ...p, crisisVividas: p.crisisVividas + 1 });
    }
  }, [total, crisis]);

  // Ciclo de respiración guiada durante la crisis
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

  // Migración de burbujas si el niño no interactúa (3.2) y ruido fuerte periódico (4.1)
  useEffect(() => {
    const intervaloMs = clinico.intervaloEventosSeg * 1000;

    const reloj = setInterval(() => {
      if (ocupadoRef.current) return;
      if (Date.now() - ultimaInteraccion.current >= intervaloMs) {
        ultimaInteraccion.current = Date.now();
        setBurbujas((prev) => {
          const emociones = Object.values(prev).filter(Boolean) as EmotionId[];
          const ids = COMPANEROS.map((c) => c.id).sort(() => Math.random() - 0.5);
          const nuevas: Record<string, EmotionId | undefined> = {};
          emociones.forEach((e, i) => {
            nuevas[ids[i]] = e;
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

  function moverJugador(e: React.MouseEvent<HTMLDivElement>) {
    if (ocupadoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // solo dentro del piso de la sala
    setPosJugador({ x: Math.max(4, Math.min(96, x)), y: Math.max(58, Math.min(96, y)) });
    marcarInteraccion();
  }

  function tocarNpc(npc: NpcDef) {
    if (ocupadoRef.current) return;
    marcarInteraccion();
    setPosJugador({ x: Math.max(4, Math.min(96, npc.x + 7)), y: Math.min(96, npc.y + 3) });
    const emocion = burbujas[npc.id];
    setTimeout(() => {
      if (npc.id === "profe") {
        setDialogo({ tipo: "profe-apertura" });
      } else if (emocion) {
        setDialogo({ tipo: "npc", npc, emocion, linea: elegirLinea(LINEAS_NPC, emocion, "escuela") });
      } else {
        setAviso(`${npc.nombre} dice: «¡Hola! ¿Jugamos al recreo?»`);
        setTimeout(() => setAviso(null), 2500);
      }
    }, 500);
  }

  function escucharNpc(npc: NpcDef, emocion: EmotionId) {
    setDialogo(null);
    setBurbujas((b) => ({ ...b, [npc.id]: undefined }));
    // reaparece otra burbuja más tarde, manteniendo la mezcla de la salvaguarda 5.2
    setTimeout(() => {
      setBurbujas((prev) => {
        const libres = COMPANEROS.filter((c) => !prev[c.id]);
        if (libres.length === 0) return prev;
        const elegido = libres[Math.floor(Math.random() * libres.length)];
        const pool: EmotionId[] =
          Math.random() < 0.55 ? DISPLACENTERAS : (["alegria", "calma"] as EmotionId[]);
        const nueva = pool[Math.floor(Math.random() * pool.length)];
        return { ...prev, [elegido.id]: nueva };
      });
    }, RESPAWN_BURBUJA_MS);

    const info = EMOTIONS[emocion];
    if (info.displacentera) {
      // el color viaja a la guatita (3.3)
      const key = Date.now();
      setPuntoViaje({ color: info.color, x: npc.x, y: npc.y - 14, key });
      setTimeout(() => {
        setPuntoViaje((p) => (p && p.key === key ? { ...p, x: posJugador.x, y: posJugador.y - 6 } : p));
      }, 60);
      setTimeout(() => {
        setPuntoViaje(null);
        setCarga((c) => sumarCarga(c, emocion, CARGA_POR_BURBUJA));
        setAviso(
          `El ${info.nombre} de ${npc.nombre} se quedó en tu guatita. ¿Lo sientes ahí?`
        );
        setTimeout(() => setAviso(null), 3500);
      }, 1250);
    } else if (emocion === "calma") {
      setCarga((c) => reducirTotal(c, ALIVIO_AMIGO_CALMA));
      setAviso("Estar con un amigo tranquilo ayudó un poquito a tu cuerpo. 💚");
      setTimeout(() => setAviso(null), 3000);
    } else {
      setAviso("¡Qué entretenido! Compartir alegría también es parte del día. 💛");
      setTimeout(() => setAviso(null), 3000);
    }
  }

  // Conversación con la figura de apoyo: baja fuerte pero NO a cero (salvaguarda 5.3)
  function contarALaProfe(emocion: EmotionId) {
    setDialogo(null);
    setNubes(true);
    setTimeout(() => {
      setNubes(false);
      setCarga((c) => {
        const v = c[emocion] ?? 0;
        return { ...c, [emocion]: Math.max(v * 0.3, 4) };
      });
      setAviso(
        "Contarle a la profe te ayudó mucho. Tu cuerpo aún siente un poquito, y está bien: ahora puedes usar tus herramientas."
      );
      setTimeout(() => setAviso(null), 4500);
    }, 2800);
  }

  function hacerEjercicio(ej: Exercise) {
    setDialogo(null);
    setAnimEjercicio(ej);
    setTimeout(() => {
      setAnimEjercicio(null);
      setCarga((c) => reducirTotal(c, ALIVIO_EJERCICIO));
      // puente juego → vida real (3.5), presente desde el MVP
      setDialogo({ tipo: "puente", ejercicio: ej });
    }, 1800);
  }

  function responderPuente(ej: Exercise, loHizo: boolean) {
    setDialogo(null);
    if (loHizo) {
      const p = storage.getProgress();
      storage.setProgress({
        ...p,
        hechosEnVidaReal: {
          ...p.hechosEnVidaReal,
          [ej.id]: (p.hechosEnVidaReal[ej.id] ?? 0) + 1,
        },
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

  // emociones acumuladas, para las respuestas coloreadas dinámicas de la profe (3.4)
  const emocionesAcumuladas = DISPLACENTERAS.filter((id) => (carga[id] ?? 0) >= 4);

  // ---------- render ----------

  return (
    <div className="escena-envoltorio" onClick={moverJugador}>
      {/* decoración de la sala */}
      <div className="escena-pizarra">Sala de clases 🏫</div>
      <div className="escena-ventana" style={{ right: "8%", top: "7%" }} />
      <div className="escena-ventana" style={{ right: "28%", top: "7%" }} />

      <Link href="/" className="salir-enlace" onClick={(e) => e.stopPropagation()}>
        ← Salir
      </Link>

      {/* HUD */}
      <div className="hud" onClick={(e) => e.stopPropagation()}>
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

      {/* aviso de carga alta: anticipar la crisis (3.6) */}
      {total >= 75 && crisis === "no" && !aviso && (
        <div className="aviso-carga">
          Tu guatita está muy llena… ¿probamos una herramienta o le contamos a la profe?
        </div>
      )}
      {aviso && <div className="aviso-carga" style={{ borderColor: "var(--acento)", color: "var(--tinta)" }}>{aviso}</div>}

      {/* profesora */}
      <button
        className="npc"
        style={{ left: `${PROFE.x}%`, top: `${PROFE.y}%` }}
        onClick={(e) => {
          e.stopPropagation();
          tocarNpc(PROFE);
        }}
      >
        <NpcSvg piel={PROFE.piel} pelo={PROFE.colorPelo} polera={PROFE.polera} esAdulto />
        <span className="npc-nombre">{PROFE.nombre}</span>
      </button>

      {/* compañeros con burbujas emocionales */}
      {COMPANEROS.map((npc) => {
        const emocion = burbujas[npc.id];
        return (
          <button
            key={npc.id}
            className="npc"
            style={{ left: `${npc.x}%`, top: `${npc.y}%` }}
            onClick={(e) => {
              e.stopPropagation();
              tocarNpc(npc);
            }}
          >
            {emocion && (
              <span
                className="burbuja"
                style={{ background: EMOTIONS[emocion].color }}
                aria-label={`burbuja de ${EMOTIONS[emocion].nombre}`}
              />
            )}
            <NpcSvg piel={npc.piel} pelo={npc.colorPelo} polera={npc.polera} />
            <span className="npc-nombre">{npc.nombre}</span>
          </button>
        );
      })}

      {/* el avatar del niño */}
      <div className="jugador" style={{ left: `${posJugador.x}%`, top: `${posJugador.y}%` }}>
        <AvatarSvg config={avatar} charge={carga} mood={mood} size={86} />
      </div>

      {/* punto de color que viaja a la guatita */}
      {puntoViaje && (
        <div
          className="punto-viaje"
          style={{
            left: `${puntoViaje.x}%`,
            top: `${puntoViaje.y}%`,
            background: puntoViaje.color,
          }}
        />
      )}

      {/* ruido fuerte */}
      {ruido && <div className="ruido-fuerte">💥 ¡RUIDO FUERTE!</div>}

      {/* animación breve de ejercicio */}
      {animEjercicio && (
        <div className="velo" style={{ alignItems: "center" }}>
          <div className="dialogo" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3.4rem" }}>{animEjercicio.emoji}</div>
            <p className="dialogo-texto">
              Tu personaje está haciendo: <strong>{animEjercicio.nombre}</strong>…
            </p>
          </div>
        </div>
      )}

      {/* diálogos */}
      {dialogo?.tipo === "npc" && (
        <div className="velo" onClick={(e) => e.stopPropagation()}>
          <div className="dialogo">
            <span className="dialogo-hablante">{dialogo.npc.nombre}</span>
            <p className="dialogo-texto">«{dialogo.linea}»</p>
            <button
              className="opcion-coloreada"
              style={{ background: EMOTIONS[dialogo.emocion].color }}
              onClick={() => escucharNpc(dialogo.npc, dialogo.emocion)}
            >
              Escuchar a {dialogo.npc.nombre}
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "profe-apertura" && (
        <div className="velo" onClick={(e) => e.stopPropagation()}>
          <div className="dialogo">
            <span className="dialogo-hablante">{PROFE.nombre}</span>
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
                  onClick={() => contarALaProfe(id)}
                >
                  «Siento {EMOTIONS[id].nombre} y te quiero contar…»
                </button>
              ))
            )}
            <button className="boton secundario" onClick={() => setDialogo(null)}>
              Volver a la sala
            </button>
          </div>
        </div>
      )}

      {dialogo?.tipo === "herramientas" && (
        <div className="velo" onClick={(e) => e.stopPropagation()}>
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
        <div className="velo" onClick={(e) => e.stopPropagation()}>
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

      {/* transición de nubes al conversar con la profe */}
      {nubes && (
        <div className="nubes">
          <div className="nube" style={{ width: 180, height: 70, left: "12%", top: "22%" }} />
          <div className="nube" style={{ width: 240, height: 90, right: "10%", top: "40%", animationDelay: "0.6s" }} />
          <div className="nube" style={{ width: 150, height: 60, left: "30%", bottom: "18%", animationDelay: "1.1s" }} />
          <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "#4a6e8a", zIndex: 1 }}>
            Conversando con la profe…
          </p>
        </div>
      )}

      {/* crisis: pausa guiada de calma (3.6, decisión #9) */}
      {crisis !== "no" && (
        <div className="nubes" style={{ flexDirection: "column", gap: 24, padding: 24 }}>
          {crisis === "respirando" ? (
            <>
              <p style={{ fontSize: "1.35rem", fontWeight: 800, color: "#4a6e8a", textAlign: "center", margin: 0 }}>
                Tu cuerpo se llenó demasiado y necesita una pausa.
                <br />
                La profe está contigo. Respiremos juntos.
              </p>
              <div className="respiracion-circulo" />
              <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#357fb0", margin: 0 }}>
                {faseRespiracion === "inhala" ? "Inhala… 🌬️" : "Exhala… 😌"}
              </p>
              <AvatarSvg config={avatar} mood="calma" size={90} />
            </>
          ) : (
            <>
              <AvatarSvg config={avatar} mood="calma" size={110} />
              <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4a6e8a", textAlign: "center", maxWidth: 420, margin: 0 }}>
                A veces la carga se llena y el cuerpo necesita parar. No es tu culpa y no estás solo.
                La próxima vez puedes usar tus herramientas un poquito antes, o contarle a la profe
                cómo te sientes.
              </p>
              <button className="boton verde" style={{ maxWidth: 280 }} onClick={salirDeCrisis}>
                Volver a la sala
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
