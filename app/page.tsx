"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AvatarConfig, DEFAULT_AVATAR, Progress, DEFAULT_PROGRESS, storage } from "@/lib/storage";

const CharacterPreview = dynamic(() => import("@/components/three/CharacterPreview"), {
  ssr: false,
});

export default function Inicio() {
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [progreso, setProgreso] = useState<Progress>(DEFAULT_PROGRESS);

  useEffect(() => {
    setAvatar(storage.getAvatar());
    setProgreso(storage.getProgress());
  }, []);

  const totalReales = Object.values(progreso.hechosEnVidaReal).reduce((a, b) => a + b, 0);

  return (
    <main className="pantalla">
      <h1 className="titulo">Mi Calma</h1>
      <p className="subtitulo">Un juego para practicar cómo volver a la calma</p>

      <div className="tarjeta" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <CharacterPreview config={avatar} height={210} />
        <Link href="/avatar" className="boton secundario" style={{ maxWidth: 260 }}>
          ✏️ Cambiar mi personaje
        </Link>
      </div>

      <Link href="/escuela" className="boton" style={{ fontSize: "1.25rem", padding: "20px" }}>
        🏫 Jugar en la Escuela
      </Link>

      <div className="fila-botones">
        <button className="boton secundario" disabled>
          🏠 Casa (próximamente)
        </button>
        <button className="boton secundario" disabled>
          🚦 Calle (próximamente)
        </button>
      </div>

      {totalReales > 0 && (
        <div className="tarjeta" style={{ textAlign: "center" }}>
          <strong>🌟 Ejercicios que hiciste de verdad: {totalReales}</strong>
          <p style={{ margin: "6px 0 0", color: "var(--tinta-suave)", fontSize: "0.95rem" }}>
            Cada vez que practicas en la vida real, tu calma se hace más fuerte.
          </p>
        </div>
      )}

      <p className="nota-pie">
        <Link href="/clinico">Modo clínico</Link> · <Link href="/escuela-2d">Versión 2D</Link> ·
        Prototipo de validación · El juego no guarda datos clínicos ni personales: todo queda solo
        en este dispositivo.
      </p>
    </main>
  );
}
