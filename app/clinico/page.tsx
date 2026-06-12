"use client";

// Modo clínico: simula la configuración por caso que en el producto completo
// hace el profesional desde su cuenta (salvaguarda 5.4: el set de reguladores
// es un parámetro por caso, no un valor fijo en el código).

import Link from "next/link";
import { useEffect, useState } from "react";
import { EXERCISE_LIBRARY, FAMILIAS, Familia } from "@/lib/exercises";
import { ClinicalConfig, DEFAULT_CLINICAL, storage } from "@/lib/storage";

const ORDEN_FAMILIAS: Familia[] = [
  "propioceptivo",
  "vestibular",
  "respiratorio",
  "cognitivo",
  "sensorial",
];

export default function ModoClinico() {
  const [config, setConfig] = useState<ClinicalConfig>(DEFAULT_CLINICAL);
  const [cargado, setCargado] = useState(false);
  const [reseteado, setReseteado] = useState(false);

  useEffect(() => {
    setConfig(storage.getClinical());
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) storage.setClinical(config);
  }, [config, cargado]);

  function alternarEjercicio(id: string) {
    setConfig((c) => {
      const activos = c.ejercicios.includes(id)
        ? c.ejercicios.filter((e) => e !== id)
        : [...c.ejercicios, id];
      return { ...c, ejercicios: activos };
    });
  }

  return (
    <main className="pantalla">
      <h1 className="titulo">Modo clínico</h1>
      <p className="subtitulo">
        Configuración del caso para la sesión de juego. En el producto completo, esto vive en la
        cuenta del profesional y el niño nunca lo ve.
      </p>

      <div className="tarjeta">
        <strong>Biblioteca de reguladores</strong>
        <p style={{ color: "var(--tinta-suave)", fontSize: "0.92rem", margin: "6px 0 12px" }}>
          Organizada por mecanismo, no por diagnóstico. El input <em>intenso</em> regula a un perfil
          buscador pero puede sobrecargar a uno hipersensible. Las técnicas marcadas{" "}
          <span className="chip-seg precaucion">precaución</span> no se ofrecen como calmante a un
          niño hiperactivado ni hipersensible. Seleccione según el perfil sensorial del niño.
        </p>
        {ORDEN_FAMILIAS.map((fam) => {
          const ejercicios = EXERCISE_LIBRARY.filter((e) => e.familia === fam);
          const info = FAMILIAS[fam];
          return (
            <div key={fam} style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                Familia {info.letra} · {info.nombre}
              </div>
              <p style={{ color: "var(--tinta-suave)", fontSize: "0.82rem", margin: "2px 0 6px" }}>
                {info.descripcion}
              </p>
              {ejercicios.map((ej) => {
                const activo = config.ejercicios.includes(ej.id);
                return (
                  <label key={ej.id} className="fila-check">
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() => alternarEjercicio(ej.id)}
                    />
                    <span style={{ fontSize: "1.2rem" }}>{ej.emoji}</span>
                    <span style={{ flex: 1 }}>
                      <strong>{ej.nombre}</strong>{" "}
                      <span style={{ color: "var(--tinta-suave)" }}>
                        {ej.estado === "subir" ? "↑ activa" : ej.estado === "bajar" ? "↓ calma" : "• localiza"}
                      </span>
                      <br />
                      <small style={{ color: "var(--tinta-suave)" }}>{ej.instruccion}</small>
                    </span>
                    <span className={`chip-seg ${ej.seguridad}`}>
                      {ej.seguridad === "precaucion" ? "precaución" : "seguro"}
                    </span>
                  </label>
                );
              })}
            </div>
          );
        })}
        {config.ejercicios.length === 0 && (
          <p style={{ color: "var(--rojo)", fontWeight: 700, marginTop: 10 }}>
            ⚠ Debe haber al menos un regulador activo para que el niño pueda jugar.
          </p>
        )}
      </div>

      <div className="tarjeta">
        <strong>Ritmo de eventos del contexto</strong>
        <p style={{ color: "var(--tinta-suave)", fontSize: "0.92rem", margin: "6px 0 12px" }}>
          Intervalo de la migración de burbujas y del «ruido fuerte». La spec sugiere ~4 minutos;
          para demostraciones conviene un ritmo más corto.
        </p>
        <input
          type="range"
          min={30}
          max={240}
          step={15}
          value={config.intervaloEventosSeg}
          onChange={(e) => setConfig({ ...config, intervaloEventosSeg: Number(e.target.value) })}
          style={{ width: "100%" }}
        />
        <div style={{ textAlign: "center", fontWeight: 700 }}>
          {config.intervaloEventosSeg} segundos
        </div>
      </div>

      <div className="tarjeta">
        <strong>Progreso del dispositivo</strong>
        <p style={{ color: "var(--tinta-suave)", fontSize: "0.92rem", margin: "6px 0 12px" }}>
          Todo el progreso vive solo en este dispositivo (sin servidor, sin datos clínicos).
        </p>
        <button
          className="boton secundario"
          onClick={() => {
            storage.resetProgress();
            setReseteado(true);
          }}
        >
          {reseteado ? "✓ Progreso borrado" : "Borrar progreso del juego"}
        </button>
      </div>

      <Link href="/" className="boton">
        Volver al inicio
      </Link>
    </main>
  );
}
