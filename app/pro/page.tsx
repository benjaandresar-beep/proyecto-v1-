"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Caso,
  CuentaPro,
  generarClave,
  hashSimple,
  nuevoCaso,
  proStorage,
} from "@/lib/pro";
import { generarBloques, RASGOS } from "@/lib/guide";
import { EXERCISE_LIBRARY, FAMILIAS, Familia } from "@/lib/exercises";
import { storage } from "@/lib/storage";

const ORDEN_FAMILIAS: Familia[] = [
  "propioceptivo",
  "vestibular",
  "respiratorio",
  "cognitivo",
  "sensorial",
];

const DIAGNOSTICOS = ["TEA", "TDAH", "AuDHD"];
const PROFESIONES = [
  "Psicólogo/a",
  "Terapeuta ocupacional",
  "Fonoaudiólogo/a",
  "Psicopedagogo/a",
];
const SENSORIALES = [
  { id: "buscador", nombre: "Buscador", ayuda: "se regula con movimiento e input fuerte" },
  { id: "evitador", nombre: "Evitador", ayuda: "se sobrecarga con estímulos intensos" },
  { id: "mixto",    nombre: "Mixto",    ayuda: "combina búsqueda y evitación" },
] as const;

type Vista = "casos" | "caso" | "guiaFinal";

/* ===== Barra superior ===== */
function ProTopbar({
  cuenta,
  onLogout,
}: {
  cuenta: CuentaPro;
  onLogout: () => void;
}) {
  return (
    <div className="pro-topbar">
      <div className="pro-marca">
        <span className="pro-marca-nombre">Mi Calma</span>
        <span className="pro-marca-tag">Acceso profesional</span>
      </div>
      <div className="pro-usuario">
        <strong>{cuenta.nombre}</strong>
        {cuenta.profesion}
        <br />
        <button
          onClick={onLogout}
          style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.75)",
            cursor: "pointer", fontSize: "0.78rem", padding: 0, marginTop: 2,
            fontFamily: "inherit",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/* ===== Componente principal ===== */
export default function LadoProfesional() {
  const [cargado, setCargado]       = useState(false);
  const [cuenta, setCuenta]         = useState<CuentaPro | null>(null);
  const [sesion, setSesion]         = useState(false);
  const [casos, setCasos]           = useState<Caso[]>([]);
  const [vista, setVista]           = useState<Vista>("casos");
  const [casoId, setCasoId]         = useState<string | null>(null);
  const [avisoCopia, setAvisoCopia] = useState(false);

  useEffect(() => {
    setCuenta(proStorage.getCuenta());
    setSesion(proStorage.getSesion());
    setCasos(proStorage.getCasos());
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) proStorage.setCasos(casos);
  }, [casos, cargado]);

  const caso = useMemo(
    () => casos.find((c) => c.id === casoId) ?? null,
    [casos, casoId]
  );

  function actualizarCaso(id: string, cambio: Partial<Caso>) {
    setCasos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...cambio } : c))
    );
  }

  if (!cargado) return null;

  if (!cuenta) {
    return (
      <RegistroForm
        onRegistrar={(c) => {
          proStorage.setCuenta(c);
          proStorage.setSesion(true);
          setCuenta(c);
          setSesion(true);
        }}
      />
    );
  }

  if (!sesion) {
    return (
      <LoginForm
        cuenta={cuenta}
        onEntrar={() => {
          proStorage.setSesion(true);
          setSesion(true);
        }}
      />
    );
  }

  /* ---- Vista: guía final imprimible ---- */
  if (vista === "guiaFinal" && caso?.guia) {
    const confirmados = caso.guia.bloques.filter((b) => b.estado === "confirmado");
    return (
      <main className="pantalla-pro">
        <ProTopbar cuenta={cuenta} onLogout={() => { proStorage.setSesion(false); setSesion(false); }} />
        <div className="pro-contenido">
          <div className="fila-botones no-print">
            <button className="boton secundario" onClick={() => setVista("caso")}>
              ← Volver al caso
            </button>
            <button className="boton boton-pro" onClick={() => window.print()}>
              🖨 Imprimir / Exportar
            </button>
          </div>

          <div className="pro-seccion imprimible">
            <div className="pro-seccion-cab">
              <span className="pro-seccion-icono">📄</span>
              <h2 className="pro-seccion-titulo">Guía para el hogar — Caso {caso.codigo}</h2>
            </div>
            <div className="pro-seccion-cuerpo">
              <p style={{ color: "var(--pro-meta)", fontSize: "0.88rem", margin: 0 }}>
                Generada el{" "}
                {new Date(caso.guia.generadaEl ?? Date.now()).toLocaleDateString("es-CL")}
              </p>
              {confirmados.map((b) => (
                <section key={b.id} style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: "1rem", margin: "0 0 6px", color: "var(--pro-texto)" }}>
                    {b.titulo}
                  </h3>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0, color: "var(--pro-meta)", fontSize: "0.95rem" }}>
                    {b.texto}
                  </p>
                </section>
              ))}
              <hr style={{ border: "none", borderTop: "1px solid var(--pro-borde)", margin: "16px 0 10px" }} />
              <p style={{ fontSize: "0.82rem", color: "var(--pro-meta)", margin: 0 }}>
                Elaborada por {cuenta.nombre} ({cuenta.profesion}, N° reg. {cuenta.registro}) con
                apoyo de una herramienta de redacción, revisada y validada bloque a bloque por
                el/la profesional, quien responde por su contenido.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---- Vista: caso ---- */
  if (vista === "caso" && caso) {
    const bloques    = caso.guia?.bloques ?? [];
    const pendientes = bloques.filter((b) => b.estado === "pendiente").length;
    const confirmadosCnt = bloques.filter((b) => b.estado === "confirmado").length;
    const puedeGenerar   = bloques.length > 0 && pendientes === 0 && confirmadosCnt > 0;

    return (
      <main className="pantalla-pro">
        <ProTopbar cuenta={cuenta} onLogout={() => { proStorage.setSesion(false); setSesion(false); }} />
        <div className="pro-contenido">

          {/* Cabecera */}
          <div className="pro-page-header">
            <div>
              <button
                onClick={() => setVista("casos")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--pro-meta)", fontSize: "0.85rem",
                  fontFamily: "inherit", padding: "0 0 6px",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                ← Mis casos
              </button>
              <h1 className="pro-page-titulo">Caso {caso.codigo}</h1>
            </div>
          </div>

          {/* Ficha clínica */}
          <div className="pro-seccion">
            <div className="pro-seccion-cab">
              <span className="pro-seccion-icono">📋</span>
              <h2 className="pro-seccion-titulo">Ficha del caso</h2>
            </div>
            <div className="pro-seccion-cuerpo">
              <label className="campo">
                Código del caso (sin nombre real)
                <input
                  value={caso.codigo}
                  onChange={(e) => actualizarCaso(caso.id, { codigo: e.target.value })}
                />
              </label>

              <div>
                <span className="campo-titulo">Diagnóstico(s)</span>
                <div className="muestrario">
                  {DIAGNOSTICOS.map((d) => (
                    <button
                      key={d}
                      className={`muestra-opcion ${caso.diagnosticos.includes(d) ? "activa" : ""}`}
                      onClick={() =>
                        actualizarCaso(caso.id, {
                          diagnosticos: caso.diagnosticos.includes(d)
                            ? caso.diagnosticos.filter((x) => x !== d)
                            : [...caso.diagnosticos, d],
                        })
                      }
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="campo-titulo">Perfil sensorial</span>
                <div className="muestrario">
                  {SENSORIALES.map((s) => (
                    <button
                      key={s.id}
                      className={`muestra-opcion ${caso.perfilSensorial === s.id ? "activa" : ""}`}
                      title={s.ayuda}
                      onClick={() => actualizarCaso(caso.id, { perfilSensorial: s.id })}
                    >
                      {s.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="campo-titulo">Patrones conductuales/emocionales frecuentes</span>
                {RASGOS.map((r) => (
                  <label key={r.id} className="fila-check">
                    <input
                      type="checkbox"
                      checked={caso.rasgos.includes(r.id)}
                      onChange={() =>
                        actualizarCaso(caso.id, {
                          rasgos: caso.rasgos.includes(r.id)
                            ? caso.rasgos.filter((x) => x !== r.id)
                            : [...caso.rasgos, r.id],
                        })
                      }
                    />
                    {r.etiqueta}
                  </label>
                ))}
              </div>

              <label className="campo">
                Fortalezas e intereses
                <textarea
                  rows={2}
                  value={caso.fortalezas}
                  onChange={(e) => actualizarCaso(caso.id, { fortalezas: e.target.value })}
                />
              </label>
              <label className="campo">
                Forma actual / momento del NNA
                <textarea
                  rows={2}
                  value={caso.formaActual}
                  onChange={(e) => actualizarCaso(caso.id, { formaActual: e.target.value })}
                />
              </label>
              <label className="campo">
                Observaciones del profesional (no van a la guía)
                <textarea
                  rows={2}
                  value={caso.observaciones}
                  onChange={(e) => actualizarCaso(caso.id, { observaciones: e.target.value })}
                />
              </label>
            </div>
          </div>

          {/* Set de ejercicios + Clave */}
          <div className="pro-seccion">
            <div className="pro-seccion-cab">
              <span className="pro-seccion-icono">🎮</span>
              <h2 className="pro-seccion-titulo">Set de ejercicios y clave del juego</h2>
            </div>
            <div className="pro-seccion-cuerpo">
              <p className="ayuda-pro">
                Biblioteca organizada por mecanismo (A–E), no por diagnóstico. La base segura
                (A propioceptivo + C respiratorio) aplica a todos los perfiles. El vestibular
                intenso (B) solo para buscadores. Los reductores sensoriales (E) son prioritarios
                en evitadores.
              </p>
              <button
                className="boton boton-pro"
                onClick={() => {
                  const sugerido = EXERCISE_LIBRARY.filter((e) => {
                    const baseSegura =
                      (e.familia === "propioceptivo" || e.familia === "respiratorio") &&
                      e.seguridad === "transversal";
                    const cognitivosUtiles = e.familia === "cognitivo";
                    if (caso.perfilSensorial === "buscador") {
                      return baseSegura || cognitivosUtiles || e.familia === "vestibular";
                    }
                    if (caso.perfilSensorial === "evitador") {
                      return (
                        baseSegura || cognitivosUtiles || e.familia === "sensorial" ||
                        (e.familia === "vestibular" && e.seguridad === "transversal")
                      );
                    }
                    return e.seguridad === "transversal" || cognitivosUtiles;
                  }).map((e) => e.id);
                  actualizarCaso(caso.id, { ejercicios: sugerido });
                }}
              >
                ✨ Sugerir set según perfil ({caso.perfilSensorial})
              </button>

              {ORDEN_FAMILIAS.map((fam) => {
                const ejercicios = EXERCISE_LIBRARY.filter((e) => e.familia === fam);
                const info = FAMILIAS[fam];
                return (
                  <div key={fam}>
                    <div className="familia-cab">
                      <span className="familia-letra">{info.letra}</span>
                      <span className="familia-nombre">{info.nombre}</span>
                    </div>
                    {ejercicios.map((ej) => (
                      <label key={ej.id} className="fila-check">
                        <input
                          type="checkbox"
                          checked={caso.ejercicios.includes(ej.id)}
                          onChange={() =>
                            actualizarCaso(caso.id, {
                              ejercicios: caso.ejercicios.includes(ej.id)
                                ? caso.ejercicios.filter((x) => x !== ej.id)
                                : [...caso.ejercicios, ej.id],
                            })
                          }
                        />
                        <span style={{ fontSize: "1.1rem" }}>{ej.emoji}</span>
                        <span style={{ flex: 1 }}>{ej.nombre}</span>
                        <span className={`chip-seg ${ej.seguridad}`}>
                          {ej.seguridad === "precaucion" ? "precaución" : "seguro"}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })}

              <button
                className="boton verde"
                onClick={() => {
                  storage.setClinical({ ...storage.getClinical(), ejercicios: caso.ejercicios });
                  alert("Set aplicado al juego de este dispositivo.");
                }}
              >
                🎮 Aplicar set al juego de este dispositivo
              </button>

              <hr style={{ border: "none", borderTop: "1px solid var(--pro-borde)", margin: "4px 0" }} />

              <div>
                <span className="campo-titulo">Clave de acceso al juego</span>
                <p className="ayuda-pro">
                  Abre únicamente el juego — nunca la ficha ni la guía. El niño o la niña
                  solo ve el avatar y los ejercicios configurados. Revocable en cualquier momento.
                </p>
                {caso.clave ? (
                  <>
                    <code className="clave-juego">{caso.clave}</code>
                    <div className="fila-botones" style={{ marginTop: 10 }}>
                      <button
                        className="boton secundario"
                        onClick={() => {
                          navigator.clipboard?.writeText(caso.clave!);
                          setAvisoCopia(true);
                          setTimeout(() => setAvisoCopia(false), 2000);
                        }}
                      >
                        {avisoCopia ? "✓ Copiada" : "Copiar"}
                      </button>
                      <button
                        className="boton secundario"
                        onClick={() => actualizarCaso(caso.id, { clave: generarClave() })}
                      >
                        Regenerar
                      </button>
                      <button
                        className="boton secundario"
                        style={{ color: "var(--rojo)" }}
                        onClick={() => actualizarCaso(caso.id, { clave: null })}
                      >
                        Revocar
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="boton boton-pro"
                    onClick={() => actualizarCaso(caso.id, { clave: generarClave() })}
                  >
                    🔑 Generar clave del juego
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Guía para el hogar */}
          <div className="pro-seccion">
            <div className="pro-seccion-cab">
              <span className="pro-seccion-icono">📝</span>
              <h2 className="pro-seccion-titulo">Guía para el hogar</h2>
            </div>
            <div className="pro-seccion-cuerpo">
              {!caso.guia ? (
                <>
                  <p className="ayuda-pro">
                    El sistema genera un borrador desde el perfil del caso usando plantillas con
                    reglas clínicas. Usted revisará cada bloque —confirmar, ajustar o descartar—
                    antes de poder generar la guía final. No hay «aprobar todo» en un clic
                    (salvaguarda 5.5).
                  </p>
                  <button
                    className="boton boton-pro"
                    onClick={() =>
                      actualizarCaso(caso.id, {
                        guia: { bloques: generarBloques(caso), generadaEl: null },
                      })
                    }
                  >
                    📝 Generar borrador desde la ficha
                  </button>
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex", gap: 8, flexWrap: "wrap",
                      padding: "10px 14px",
                      background: "var(--pro-suave)",
                      borderRadius: 10, fontSize: "0.85rem",
                    }}
                  >
                    <span className="pro-badge pro-badge--ok">✓ {confirmadosCnt} confirmados</span>
                    <span className="pro-badge pro-badge--pend">⏳ {pendientes} pendientes</span>
                    <span className="pro-badge pro-badge--sin">
                      ✕ {bloques.filter((b) => b.estado === "descartado").length} descartados
                    </span>
                  </div>

                  {bloques.map((b) => (
                    <div key={b.id} className={`bloque-guia ${b.estado}`}>
                      <div className="bloque-cabecera">
                        <strong>{b.titulo}</strong>
                        <span className={`estado-chip ${b.estado}`}>{b.estado}</span>
                      </div>
                      <textarea
                        rows={5}
                        value={b.texto}
                        onChange={(e) =>
                          actualizarCaso(caso.id, {
                            guia: {
                              ...caso.guia!,
                              bloques: bloques.map((x) =>
                                x.id === b.id
                                  ? { ...x, texto: e.target.value, estado: "pendiente" }
                                  : x
                              ),
                            },
                          })
                        }
                      />
                      <div className="fila-botones">
                        {b.estado !== "confirmado" && (
                          <button
                            className="boton verde"
                            onClick={() =>
                              actualizarCaso(caso.id, {
                                guia: {
                                  ...caso.guia!,
                                  bloques: bloques.map((x) =>
                                    x.id === b.id ? { ...x, estado: "confirmado" } : x
                                  ),
                                },
                              })
                            }
                          >
                            ✓ Confirmar
                          </button>
                        )}
                        {b.estado !== "descartado" && (
                          <button
                            className="boton secundario"
                            onClick={() =>
                              actualizarCaso(caso.id, {
                                guia: {
                                  ...caso.guia!,
                                  bloques: bloques.map((x) =>
                                    x.id === b.id ? { ...x, estado: "descartado" } : x
                                  ),
                                },
                              })
                            }
                          >
                            ✕ Descartar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    className="boton boton-pro"
                    disabled={!puedeGenerar}
                    onClick={() => {
                      actualizarCaso(caso.id, {
                        guia: { ...caso.guia!, generadaEl: new Date().toISOString() },
                      });
                      setVista("guiaFinal");
                    }}
                  >
                    {puedeGenerar
                      ? "📄 Generar guía final"
                      : `Revise los ${pendientes} bloques pendientes para continuar`}
                  </button>

                  {caso.guia.generadaEl && (
                    <button className="boton secundario" onClick={() => setVista("guiaFinal")}>
                      Ver guía generada
                    </button>
                  )}

                  <button
                    className="boton secundario"
                    onClick={() => {
                      if (window.confirm("¿Reemplazar el borrador y perder la revisión hecha?")) {
                        actualizarCaso(caso.id, {
                          guia: { bloques: generarBloques(caso), generadaEl: null },
                        });
                      }
                    }}
                  >
                    ↺ Volver a generar borrador desde la ficha
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="nota-pie" style={{ color: "var(--pro-meta)" }}>
            Prototipo sin servidor · Ficha y casos en este dispositivo únicamente ·{" "}
            <Link href="/jugar/">Ir al juego</Link>
          </p>
        </div>
      </main>
    );
  }

  /* ---- Vista: lista de casos ---- */
  const activos   = casos.filter((c) => !c.archivado);
  const archivados = casos.filter((c) => c.archivado);

  return (
    <main className="pantalla-pro">
      <ProTopbar
        cuenta={cuenta}
        onLogout={() => { proStorage.setSesion(false); setSesion(false); }}
      />
      <div className="pro-contenido">

        <div className="pro-page-header">
          <div>
            <h1 className="pro-page-titulo">Mis pacientes</h1>
            <p className="pro-page-meta">
              {cuenta.profesion} · Reg. {cuenta.registro}
            </p>
          </div>
          <button
            className="boton boton-pro"
            style={{ width: "auto", padding: "12px 20px", fontSize: "1rem" }}
            onClick={() => {
              const c = nuevoCaso(casos);
              setCasos((prev) => [...prev, c]);
              setCasoId(c.id);
              setVista("caso");
            }}
          >
            ＋ Nuevo caso
          </button>
        </div>

        {activos.length === 0 && (
          <div
            style={{
              background: "white", border: "1px solid var(--pro-borde)",
              borderRadius: 14, padding: "28px 20px",
              textAlign: "center", color: "var(--pro-meta)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📂</div>
            <p style={{ margin: 0, fontWeight: 600 }}>Aún no hay casos</p>
            <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>
              Se identifican por código, nunca por nombre real.
            </p>
          </div>
        )}

        {activos.map((c) => {
          const guiaBadge = c.guia
            ? c.guia.generadaEl
              ? <span className="pro-badge pro-badge--ok">Guía lista ✓</span>
              : <span className="pro-badge pro-badge--pend">Guía en revisión</span>
            : <span className="pro-badge pro-badge--sin">Sin guía</span>;
          const claveBadge = c.clave
            ? <span className="pro-badge pro-badge--clave">🔑 Clave activa</span>
            : null;

          return (
            <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="pro-caso-card"
                style={{ flex: 1 }}
                onClick={() => { setCasoId(c.id); setVista("caso"); }}
              >
                <div style={{ flex: 1 }}>
                  <div className="pro-caso-codigo">{c.codigo}</div>
                  <div className="pro-caso-meta">
                    {c.diagnosticos.length > 0
                      ? c.diagnosticos.join(" · ")
                      : "Sin diagnóstico aún"}
                    {" · "}
                    {guiaBadge}
                    {claveBadge}
                  </div>
                </div>
                <span className="pro-caso-arrow">›</span>
              </button>
              <button
                className="boton secundario"
                style={{ width: "auto", padding: "10px 14px", fontSize: "0.85rem", flexShrink: 0 }}
                onClick={() => actualizarCaso(c.id, { archivado: true })}
              >
                Archivar
              </button>
            </div>
          );
        })}

        {archivados.length > 0 && (
          <div>
            <p className="pro-archivados-titulo">Archivados ({archivados.length})</p>
            {archivados.map((c) => (
              <div key={c.id} className="pro-archivado-row">
                <span style={{ flex: 1, fontWeight: 600, color: "var(--pro-meta)" }}>
                  {c.codigo}
                </span>
                <button
                  className="boton secundario"
                  style={{ width: "auto", padding: "8px 14px", fontSize: "0.85rem" }}
                  onClick={() => actualizarCaso(c.id, { archivado: false })}
                >
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="nota-pie" style={{ color: "var(--pro-meta)" }}>
          Prototipo sin servidor · La ficha y los casos viven solo en este dispositivo ·{" "}
          <Link href="/jugar/">Ir al juego</Link>
        </p>
      </div>
    </main>
  );
}

/* ===== Formularios de acceso ===== */

function RegistroForm({ onRegistrar }: { onRegistrar: (c: CuentaPro) => void }) {
  const [nombre,    setNombre]    = useState("");
  const [profesion, setProfesion] = useState(PROFESIONES[0]);
  const [email,     setEmail]     = useState("");
  const [registro,  setRegistro]  = useState("");
  const [clave,     setClave]     = useState("");

  const valido = nombre.trim() && email.trim() && registro.trim() && clave.length >= 4;

  return (
    <main className="pantalla-pro">
      <div className="pro-topbar">
        <div className="pro-marca">
          <span className="pro-marca-nombre">Mi Calma</span>
          <span className="pro-marca-tag">Acceso profesional</span>
        </div>
      </div>
      <div className="pro-contenido pro-contenido--centrado">
        <div className="pro-acceso-card">
          <h1 className="pro-acceso-titulo">Registro profesional</h1>
          <p className="pro-acceso-sub">
            El número de registro de prestador se declara. La verificación contra el
            registro oficial es una fase posterior del prototipo.
          </p>
          <label className="campo">
            Nombre completo
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="campo">
            Profesión
            <select value={profesion} onChange={(e) => setProfesion(e.target.value)}>
              {PROFESIONES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="campo">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="campo">
            N° registro de prestador de salud
            <input value={registro} onChange={(e) => setRegistro(e.target.value)} />
          </label>
          <label className="campo">
            Contraseña (mínimo 4 caracteres)
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
          </label>
          <button
            className="boton boton-pro"
            style={{ marginTop: 6 }}
            disabled={!valido}
            onClick={() =>
              onRegistrar({
                nombre:    nombre.trim(),
                profesion,
                email:     email.trim().toLowerCase(),
                registro:  registro.trim(),
                claveHash: hashSimple(clave),
              })
            }
          >
            Crear cuenta
          </button>
          <Link href="/jugar/" className="boton secundario" style={{ marginTop: 10 }}>
            Volver al juego
          </Link>
        </div>
      </div>
    </main>
  );
}

function LoginForm({
  cuenta,
  onEntrar,
}: {
  cuenta: CuentaPro;
  onEntrar: () => void;
}) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(false);

  return (
    <main className="pantalla-pro">
      <div className="pro-topbar">
        <div className="pro-marca">
          <span className="pro-marca-nombre">Mi Calma</span>
          <span className="pro-marca-tag">Acceso profesional</span>
        </div>
      </div>
      <div className="pro-contenido pro-contenido--centrado">
        <div className="pro-acceso-card">
          <h1 className="pro-acceso-titulo">Acceso profesional</h1>
          <label className="campo">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="campo">
            Contraseña
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
          </label>
          {error && (
            <p style={{ color: "var(--rojo)", fontWeight: 700, margin: "4px 0 0" }}>
              Email o contraseña incorrectos.
            </p>
          )}
          <button
            className="boton boton-pro"
            style={{ marginTop: 6 }}
            onClick={() => {
              if (
                email.trim().toLowerCase() === cuenta.email &&
                hashSimple(clave) === cuenta.claveHash
              ) {
                onEntrar();
              } else {
                setError(true);
              }
            }}
          >
            Entrar
          </button>
          <Link href="/jugar/" className="boton secundario" style={{ marginTop: 10 }}>
            Volver al juego
          </Link>
        </div>
      </div>
    </main>
  );
}
