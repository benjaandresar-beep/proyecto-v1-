"use client";

// Modo clínico: simula la configuración por caso que en el producto completo
// hace el profesional desde su cuenta (salvaguarda 5.4: el set de reguladores
// es un parámetro por caso, no un valor fijo en el código).

import Link from "next/link";
import { useEffect, useState } from "react";
import { EXERCISE_LIBRARY } from "@/lib/exercises";
import { ClinicalConfig, DEFAULT_CLINICAL, storage } from "@/lib/storage";

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
        <strong>Set de reguladores para este caso</strong>
        <p style={{ color: "var(--tinta-suave)", fontSize: "0.92rem", margin: "6px 0 12px" }}>
          Los ejercicios no sirven igual a todos los perfiles: el input <em>intenso</em> regula a un
          perfil buscador (frecuente en TDAH) pero puede sobrecargar a uno hipersensible (frecuente
          en parte del TEA). Seleccione según el perfil sensorial del niño.
        </p>
        {EXERCISE_LIBRARY.map((ej) => {
          const activo = config.ejercicios.includes(ej.id);
          return (
            <label
              key={ej.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 4px",
                borderBottom: "1px solid var(--borde)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={activo}
                onChange={() => alternarEjercicio(ej.id)}
                style={{ width: 22, height: 22 }}
              />
              <span style={{ fontSize: "1.3rem" }}>{ej.emoji}</span>
              <span style={{ flex: 1 }}>
                <strong>{ej.nombre}</strong>
                <br />
                <small style={{ color: "var(--tinta-suave)" }}>{ej.instruccion}</small>
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 8,
                  background: ej.intensidad === "intenso" ? "#fbe3df" : "#def0e6",
                  color: ej.intensidad === "intenso" ? "#a33a2d" : "#2d7a4f",
                }}
              >
                {ej.intensidad}
              </span>
            </label>
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
