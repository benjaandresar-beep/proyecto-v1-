"use client";

// Editor de avatar 2D (sección 8 de la spec: "es lo primero que engancha").

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AvatarConfig, DEFAULT_AVATAR, storage } from "@/lib/storage";

const CharacterPreview = dynamic(() => import("@/components/three/CharacterPreview"), {
  ssr: false,
});

const PIELES = ["#f5d3b3", "#e8b88a", "#c98e5f", "#9c6a43", "#6e4a2f"];
const PELOS: { id: AvatarConfig["pelo"]; nombre: string }[] = [
  { id: "corto", nombre: "Corto" },
  { id: "largo", nombre: "Largo" },
  { id: "rizado", nombre: "Rizado" },
  { id: "coleta", nombre: "Coleta" },
];
const COLORES_PELO = ["#2b2b2b", "#5b4232", "#8a5a2b", "#c98f3d", "#d6593f", "#7a7a7a"];
const POLERAS = ["#4a9fd6", "#e0503f", "#67c08a", "#f2c24b", "#9a6fd0", "#ee8fbb"];

export default function EditorAvatar() {
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setConfig(storage.getAvatar());
    setCargado(true);
  }, []);

  useEffect(() => {
    if (cargado) storage.setAvatar(config);
  }, [config, cargado]);

  return (
    <main className="pantalla">
      <h1 className="titulo">Mi personaje</h1>
      <p className="subtitulo">Hazlo como tú quieras</p>

      <CharacterPreview config={config} height={220} />

      <div className="tarjeta">
        <strong>Piel</strong>
        <div className="muestrario" style={{ marginTop: 8 }}>
          {PIELES.map((c) => (
            <button
              key={c}
              className={`muestra-color ${config.piel === c ? "activa" : ""}`}
              style={{ background: c }}
              onClick={() => setConfig({ ...config, piel: c })}
              aria-label={`Color de piel ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="tarjeta">
        <strong>Pelo</strong>
        <div className="muestrario" style={{ marginTop: 8 }}>
          {PELOS.map((p) => (
            <button
              key={p.id}
              className={`muestra-opcion ${config.pelo === p.id ? "activa" : ""}`}
              onClick={() => setConfig({ ...config, pelo: p.id })}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <div className="muestrario" style={{ marginTop: 12 }}>
          {COLORES_PELO.map((c) => (
            <button
              key={c}
              className={`muestra-color ${config.colorPelo === c ? "activa" : ""}`}
              style={{ background: c }}
              onClick={() => setConfig({ ...config, colorPelo: c })}
              aria-label={`Color de pelo ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="tarjeta">
        <strong>Polera</strong>
        <div className="muestrario" style={{ marginTop: 8 }}>
          {POLERAS.map((c) => (
            <button
              key={c}
              className={`muestra-color ${config.polera === c ? "activa" : ""}`}
              style={{ background: c }}
              onClick={() => setConfig({ ...config, polera: c })}
              aria-label={`Color de polera ${c}`}
            />
          ))}
        </div>
      </div>

      <Link href="/" className="boton verde">
        ✓ ¡Listo!
      </Link>
    </main>
  );
}
