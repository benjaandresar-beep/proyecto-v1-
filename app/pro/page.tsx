"use client";

// Lado profesional mínimo (sección 6 de la spec): casos por código, ficha →
// perfil, configuración del juego (5.4), clave que abre solo el juego (6.4) y
// guía para el hogar con revisión editable obligatoria por bloques (5.5 / 6.3).
// Prototipo sin servidor: todo vive en localStorage de ESTE dispositivo.

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
  { id: "mixto", nombre: "Mixto", ayuda: "combina búsqueda y evitación" },
] as const;

type Vista = "casos" | "caso" | "guiaFinal";

export default function LadoProfesional() {
  const [cargado, setCargado] = useState(false);
  const [cuenta, setCuenta] = useState<CuentaPro | null>(null);
  const [sesion, setSesion] = useState(false);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [vista, setVista] = useState<Vista>("casos");
  const [casoId, setCasoId] = useState<string | null>(null);
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

  const caso = useMemo(() => casos.find((c) => c.id === casoId) ?? null, [casos, casoId]);

  function actualizarCaso(id: string, cambio: Partial<Caso>) {
    setCasos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambio } : c)));
  }

  if (!cargado) return null;

  // ---------- registro / login ----------

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

  // ---------- vista: guía final imprimible ----------

  if (vista === "guiaFinal" && caso?.guia) {
    const confirmados = caso.guia.bloques.filter((b) => b.estado === "confirmado");
    return (
      <main className="pantalla">
        <div className="fila-botones no-print">
          <button className="boton secundario" onClick={() => setVista("caso")}>
            ← Volver al caso
          </button>
          <button className="boton" onClick={() => window.print()}>
            🖨 Imprimir / Exportar
          </button>
        </div>
        <div className="tarjeta imprimible">
          <h1 className="titulo" style={{ textAlign: "left" }}>
            Guía para el hogar
          </h1>
          <p style={{ color: "var(--tinta-suave)", margin: "4px 0 18px" }}>
            Caso {caso.codigo} ·{" "}
            {new Date(caso.guia.generadaEl ?? Date.now()).toLocaleDateString("es-CL")}
          </p>
          {confirmados.map((b) => (
            <section key={b.id} style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: "1.15rem", margin: "0 0 6px" }}>{b.titulo}</h2>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{b.texto}</p>
            </section>
          ))}
          <hr style={{ border: "none", borderTop: "1px solid var(--borde)", margin: "20px 0 10px" }} />
          <p style={{ fontSize: "0.85rem", color: "var(--tinta-suave)", margin: 0 }}>
            Esta guía fue elaborada por {cuenta.nombre} ({cuenta.profesion}, N° de registro{" "}
            {cuenta.registro}) con apoyo de una herramienta de redacción, y fue revisada y validada
            bloque a bloque por el/la profesional, quien responde por su contenido.
          </p>
        </div>
      </main>
    );
  }

  // ---------- vista: caso ----------

  if (vista === "caso" && caso) {
    const bloques = caso.guia?.bloques ?? [];
    const pendientes = bloques.filter((b) => b.estado === "pendiente").length;
    const confirmados = bloques.filter((b) => b.estado === "confirmado").length;
    const puedeGenerar = bloques.length > 0 && pendientes === 0 && confirmados > 0;

    return (
      <main className="pantalla">
        <button className="boton secundario" onClick={() => setVista("casos")}>
          ← Mis casos
        </button>
        <h1 className="titulo">Caso {caso.codigo}</h1>

        {/* ----- ficha clínica → perfil (6.2) ----- */}
        <div className="tarjeta">
          <strong>Ficha del caso</strong>
          <label className="campo">
            Código del caso (sin nombre real)
            <input
              value={caso.codigo}
              onChange={(e) => actualizarCaso(caso.id, { codigo: e.target.value })}
            />
          </label>

          <span className="campo-titulo">Diagnóstico(s) — etiquetas que precargan sugerencias</span>
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

          <span className="campo-titulo">Perfil sensorial (clave para el set de ejercicios, 5.4)</span>
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

          <label className="campo">
            Fortalezas e intereses (texto libre)
            <textarea
              rows={2}
              value={caso.fortalezas}
              onChange={(e) => actualizarCaso(caso.id, { fortalezas: e.target.value })}
            />
          </label>
          <label className="campo">
            Forma actual / momento del NNA (texto libre)
            <textarea
              rows={2}
              value={caso.formaActual}
              onChange={(e) => actualizarCaso(caso.id, { formaActual: e.target.value })}
            />
          </label>
          <label className="campo">
            Observaciones del profesional (no se incluyen en la guía)
            <textarea
              rows={2}
              value={caso.observaciones}
              onChange={(e) => actualizarCaso(caso.id, { observaciones: e.target.value })}
            />
          </label>
        </div>

        {/* ----- configuración del juego (5.4) + clave (6.4) ----- */}
        <div className="tarjeta">
          <strong>Juego: set de reguladores del caso</strong>
          <p className="ayuda">
            Biblioteca por mecanismo (familias A–E), no por diagnóstico. El input intenso regula a un
            perfil buscador pero puede sobrecargar a uno hipersensible. La sugerencia sigue el árbol
            de decisión: base segura (A + C) para todos, vestibular intenso (B) solo para buscadores.
          </p>
          <button
            className="boton secundario"
            onClick={() => {
              // Árbol de decisión (sección 8): base segura A+C siempre; B intenso solo en buscador;
              // E (reductores) prioritario en evitador.
              const sugerido = EXERCISE_LIBRARY.filter((e) => {
                const baseSegura =
                  (e.familia === "propioceptivo" || e.familia === "respiratorio") &&
                  e.seguridad === "transversal";
                const cognitivosUtiles = e.familia === "cognitivo";
                if (caso.perfilSensorial === "buscador") {
                  // puede descargar con vestibular intenso
                  return baseSegura || cognitivosUtiles || e.familia === "vestibular";
                }
                if (caso.perfilSensorial === "evitador") {
                  // sin vestibular intenso; suma reductores sensoriales
                  return (
                    baseSegura ||
                    cognitivosUtiles ||
                    e.familia === "sensorial" ||
                    (e.familia === "vestibular" && e.seguridad === "transversal")
                  );
                }
                // mixto: todo lo seguro transversal + cognitivos + reductores
                return e.seguridad === "transversal" || cognitivosUtiles;
              }).map((e) => e.id);
              actualizarCaso(caso.id, { ejercicios: sugerido });
            }}
          >
            ✨ Sugerir set según perfil sensorial ({caso.perfilSensorial})
          </button>
          {ORDEN_FAMILIAS.map((fam) => {
            const ejercicios = EXERCISE_LIBRARY.filter((e) => e.familia === fam);
            const info = FAMILIAS[fam];
            return (
              <div key={fam} style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                  Familia {info.letra} · {info.nombre}
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

          <span className="campo-titulo">Clave de acceso al juego</span>
          <p className="ayuda">
            La clave abre ÚNICAMENTE el juego (avatar y ejercicios configurados). Nunca abre el
            sistema, la ficha ni la guía. La familia solo juega. Es revocable.
          </p>
          {caso.clave ? (
            <>
              <code className="clave-juego">{caso.clave}</code>
              <div className="fila-botones">
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
              className="boton"
              onClick={() => actualizarCaso(caso.id, { clave: generarClave() })}
            >
              🔑 Generar clave del juego
            </button>
          )}
          <button
            className="boton verde"
            onClick={() => {
              storage.setClinical({ ...storage.getClinical(), ejercicios: caso.ejercicios });
              alert(
                "Set de ejercicios aplicado al juego de este dispositivo (en el producto final, la clave lleva esta configuración al dispositivo de la familia)."
              );
            }}
          >
            🎮 Aplicar set al juego de este dispositivo
          </button>
        </div>

        {/* ----- guía para el hogar (6.3) ----- */}
        <div className="tarjeta">
          <strong>Guía para el hogar</strong>
          {!caso.guia ? (
            <>
              <p className="ayuda">
                El sistema redacta un borrador desde el perfil (plantillas con reglas, sin IA).
                Usted deberá revisar cada bloque —confirmar, ajustar o descartar— antes de poder
                generar la guía final. No existe «aprobar todo» de un clic (salvaguarda 5.5).
              </p>
              <button
                className="boton"
                onClick={() =>
                  actualizarCaso(caso.id, {
                    guia: { bloques: generarBloques(caso), generadaEl: null },
                  })
                }
              >
                📝 Generar borrador de guía
              </button>
            </>
          ) : (
            <>
              <p className="ayuda">
                Revise cada bloque: puede editarlo, confirmarlo o descartarlo. Editar un bloque ya
                confirmado lo devuelve a pendiente. {confirmados} confirmados ·{" "}
                {bloques.filter((b) => b.estado === "descartado").length} descartados · {pendientes}{" "}
                pendientes.
              </p>
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
                className="boton"
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
                  if (window.confirm("¿Reemplazar el borrador actual y perder la revisión hecha?")) {
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
      </main>
    );
  }

  // ---------- vista: lista de casos (6.1) ----------

  const activos = casos.filter((c) => !c.archivado);
  const archivados = casos.filter((c) => c.archivado);

  return (
    <main className="pantalla">
      <h1 className="titulo">Mis pacientes</h1>
      <p className="subtitulo">
        {cuenta.nombre} · {cuenta.profesion} · Reg. {cuenta.registro}
      </p>

      <button
        className="boton"
        onClick={() => {
          const c = nuevoCaso(casos);
          setCasos((prev) => [...prev, c]);
          setCasoId(c.id);
          setVista("caso");
        }}
      >
        ＋ Nuevo caso
      </button>

      {activos.length === 0 && (
        <div className="tarjeta" style={{ textAlign: "center", color: "var(--tinta-suave)" }}>
          Aún no hay casos. Cree el primero: se identifica por código, nunca por nombre real.
        </div>
      )}

      {activos.map((c) => (
        <div key={c.id} className="tarjeta caso-tarjeta">
          <button
            className="caso-principal"
            onClick={() => {
              setCasoId(c.id);
              setVista("caso");
            }}
          >
            <strong>{c.codigo}</strong>
            <span className="ayuda">
              {c.diagnosticos.length > 0 ? c.diagnosticos.join(" · ") : "Sin diagnóstico aún"} ·{" "}
              {c.guia
                ? c.guia.generadaEl
                  ? "Guía generada ✓"
                  : "Guía en revisión…"
                : "Sin guía"}{" "}
              · {c.clave ? "Clave activa 🔑" : "Sin clave"}
            </span>
          </button>
          <button
            className="boton secundario boton-archivar"
            onClick={() => actualizarCaso(c.id, { archivado: true })}
          >
            Archivar
          </button>
        </div>
      ))}

      {archivados.length > 0 && (
        <div className="tarjeta">
          <strong style={{ color: "var(--tinta-suave)" }}>Archivados</strong>
          {archivados.map((c) => (
            <div key={c.id} className="caso-tarjeta" style={{ opacity: 0.7 }}>
              <span style={{ flex: 1 }}>{c.codigo}</span>
              <button
                className="boton secundario boton-archivar"
                onClick={() => actualizarCaso(c.id, { archivado: false })}
              >
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="nota-pie">
        <Link href="/">Ir al juego</Link> ·{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            proStorage.setSesion(false);
            setSesion(false);
          }}
        >
          Cerrar sesión
        </a>
        <br />
        Prototipo sin servidor: la ficha y los casos viven solo en este dispositivo. La guía y el
        juego nunca contienen la ficha clínica (frontera de datos, sección 2).
      </p>
    </main>
  );
}

// ---------- formularios de acceso (decisión #8: registro declarativo) ----------

function RegistroForm({ onRegistrar }: { onRegistrar: (c: CuentaPro) => void }) {
  const [nombre, setNombre] = useState("");
  const [profesion, setProfesion] = useState(PROFESIONES[0]);
  const [email, setEmail] = useState("");
  const [registro, setRegistro] = useState("");
  const [clave, setClave] = useState("");

  const valido = nombre.trim() && email.trim() && registro.trim() && clave.length >= 4;

  return (
    <main className="pantalla" style={{ justifyContent: "center" }}>
      <div className="tarjeta">
        <h1 className="titulo">Registro profesional</h1>
        <p className="subtitulo" style={{ marginBottom: 14 }}>
          El número de registro de prestador se declara (la verificación contra el registro oficial
          es una fase posterior).
        </p>
        <label className="campo">
          Nombre completo
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="campo">
          Profesión
          <select value={profesion} onChange={(e) => setProfesion(e.target.value)}>
            {PROFESIONES.map((p) => (
              <option key={p}>{p}</option>
            ))}
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
          className="boton"
          disabled={!valido}
          onClick={() =>
            onRegistrar({
              nombre: nombre.trim(),
              profesion,
              email: email.trim().toLowerCase(),
              registro: registro.trim(),
              claveHash: hashSimple(clave),
            })
          }
        >
          Crear cuenta
        </button>
        <Link href="/" className="boton secundario" style={{ marginTop: 10 }}>
          Volver al juego
        </Link>
      </div>
    </main>
  );
}

function LoginForm({ cuenta, onEntrar }: { cuenta: CuentaPro; onEntrar: () => void }) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(false);

  return (
    <main className="pantalla" style={{ justifyContent: "center" }}>
      <div className="tarjeta">
        <h1 className="titulo">Acceso profesional</h1>
        <label className="campo">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">
          Contraseña
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        {error && (
          <p style={{ color: "var(--rojo)", fontWeight: 700 }}>Email o contraseña incorrectos.</p>
        )}
        <button
          className="boton"
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
        <Link href="/" className="boton secundario" style={{ marginTop: 10 }}>
          Volver al juego
        </Link>
      </div>
    </main>
  );
}
