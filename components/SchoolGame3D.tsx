"use client";

// Contexto Escuela en 3D. Misma mecánica y salvaguardas que la versión 2D
// (secciones 3 y 4.1 de la spec); cambia solo la representación de la escena.

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Npc3D, Orbe } from "@/components/three/SchoolScene";
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
  PROFE_BASE,
  reducirTotal,
  RESPAWN_BURBUJA_MS,
  sumarCarga,
} from "@/lib/school";
import { storage } from "@/lib/storage";

const SchoolScene = dynamic(() => import("@/components/three/SchoolScene"), { ssr: false });

// posiciones [x, z] en el piso de la sala 3D
const POSICIONES: Record<string, [number, number]> = {
  martin: [-5, 1],
  sofia: [-2.5, 3.2],
  tomas: [0.8, 0.8],
  emilia: [3, 3.4],
  lucas: [5.2, 0.2],
  maite: [1.8, -2.2],
  diego: [-4.6, 3.8],
  anto: [5.6, 3.6],
  profe: [-2.2, -3.6],
};

const NPCS_3D: Npc3D[] = [
  ...COMPANEROS_BASE.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    piel: c.piel,
    pelo: c.peloEstilo,
    colorPelo: c.colorPelo,
    polera: c.polera,
    pos: POSICIONES[c.id],
  })),
  {
    id: PROFE_BASE.id,
    nombre: PROFE_BASE.nombre,
    piel: PROFE_BASE.piel,
    pelo: PROFE_BASE.peloEstilo,
    colorPelo: PROFE_BASE.colorPelo,
    polera: PROFE_BASE.polera,
    pos: POSICIONES.profe,
    esAdulto: true,
  },
];

type Dialogo =
  | { tipo: "npc"; npcId: string; nombre: string; emocion: EmotionId }
  | { tipo: "profe-apertura" }
  | { tipo: "herramientas" }
  | { tipo: "puente"; ejercicio: Exercise };

type Crisis = "no" | "respirando" | "mensaje";

export default function SchoolGame3D() {
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
  const [objetivo, setObjetivo] = useState<[number, number]>([0, 4]);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [crisis, setCrisis] = useState<Crisis>("no");
  const [faseRespiracion, setFaseRespiracion] = useState<"inhala" | "exhala">("inhala");
  const [nubes, setNubes] = useState(false);
  const [ruido, setRuido] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [orbe, setOrbe] = useState<(Orbe & { emocion: EmotionId; nombre: string }) | null>(null);
  const [animEjercicio, setAnimEjercicio] = useState<Exercise | null>(null);

  const ultimaInteraccion = useRef(Date.now());
  const ocupadoRef = useRef(false);

  const total = totalCharge(carga);
  const abrumado = total >= 75;
  ocupadoRef.current = dialogo !== null || nubes || crisis !== "no" || animEjercicio !== null;

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

  // Respiración guiada de la crisis
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

  // Migración de burbujas por inactividad (3.2) y ruido fuerte periódico (4.1)
  useEffect(() => {
    const intervaloMs = clinico.intervaloEventosSeg * 1000;

    const reloj = setInterval(() => {
      if (ocupadoRef.current) return;
      if (Date.now() - ultimaInteraccion.current >= intervaloMs) {
        ultimaInteraccion.current = Date.now();
        setBurbujas((prev) => {
          const emociones = Object.values(prev).filter(Boolean) as EmotionId[];
          const ids = COMPANEROS_BASE.map((c) => c.id).sort(() => Math.random() - 0.5);
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

  function tocarSuelo(x: number, z: number) {
    if (ocupadoRef.current) return;
    setObjetivo([x, z]);
    marcarInteraccion();
  }

  function tocarNpc(id: string) {
    if (ocupadoRef.current) return;
    marcarInteraccion();
    const pos = POSICIONES[id];
    setObjetivo([pos[0] + 0.9, Math.min(pos[1] + 0.7, 4.4)]);
    const emocion = burbujas[id];
    const npc = NPCS_3D.find((n) => n.id === id)!;
    setTimeout(() => {
      if (id === "profe") {
        setDialogo({ tipo: "profe-apertura" });
      } else if (emocion) {
        setDialogo({ tipo: "npc", npcId: id, nombre: npc.nombre, emocion });
      } else {
        setAviso(`${npc.nombre} dice: «¡Hola! ¿Jugamos al recreo?»`);
        setTimeout(() => setAviso(null), 2500);
      }
    }, 700);
  }

  function escucharNpc(npcId: string, nombre: string, emocion: EmotionId) {
    setDialogo(null);
    setBurbujas((b) => ({ ...b, [npcId]: undefined }));
    // reaparece otra burbuja más tarde, manteniendo la mezcla (5.2)
    setTimeout(() => {
      setBurbujas((prev) => {
        const libres = COMPANEROS_BASE.filter((c) => !prev[c.id]);
        if (libres.length === 0) return prev;
        const elegido = libres[Math.floor(Math.random() * libres.length)];
        const pool: EmotionId[] =
          Math.random() < 0.55 ? DISPLACENTERAS : (["alegria", "calma"] as EmotionId[]);
        return { ...prev, [elegido.id]: pool[Math.floor(Math.random() * pool.length)] };
      });
    }, RESPAWN_BURBUJA_MS);

    const info = EMOTIONS[emocion];
    if (info.displacentera) {
      // el color viaja en 3D hasta la guatita (3.3)
      const pos = POSICIONES[npcId];
      setOrbe({
        key: Date.now(),
        color: info.color,
        desde: [pos[0], 1.8, pos[1]],
        emocion,
        nombre,
      });
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

  // Figura de apoyo: baja fuerte pero NO a cero (salvaguarda 5.3)
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
      setDialogo({ tipo: "puente", ejercicio: ej }); // puente juego → vida real (3.5)
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

  const emocionesAcumuladas = DISPLACENTERAS.filter((id) => (carga[id] ?? 0) >= 4);

  // ---------- render ----------

  return (
    <div className="escena-envoltorio">
      <SchoolScene
        avatar={avatar}
        charge={carga}
        abrumado={abrumado}
        npcs={NPCS_3D}
        burbujas={burbujas}
        objetivo={objetivo}
        orbe={orbe}
        onSuelo={tocarSuelo}
        onNpc={tocarNpc}
        onOrbeLlega={llegoOrbe}
      />

      <Link href="/" className="salir-enlace">
        ← Salir
      </Link>

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
          Tu guatita está muy llena… ¿probamos una herramienta o le contamos a la profe?
        </div>
      )}
      {aviso && (
        <div className="aviso-carga" style={{ borderColor: "var(--acento)", color: "var(--tinta)" }}>
          {aviso}
        </div>
      )}

      {ruido && <div className="ruido-fuerte">💥 ¡RUIDO FUERTE!</div>}

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

      {dialogo?.tipo === "npc" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">{dialogo.nombre}</span>
            <p className="dialogo-texto">«{LINEAS_NPC[dialogo.emocion]}»</p>
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

      {dialogo?.tipo === "profe-apertura" && (
        <div className="velo">
          <div className="dialogo">
            <span className="dialogo-hablante">{PROFE_BASE.nombre}</span>
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
            Conversando con la profe…
          </p>
        </div>
      )}

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
            </>
          ) : (
            <>
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
