"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  AvatarConfig,
  DEFAULT_AVATAR,
  Progress,
  DEFAULT_PROGRESS,
  storage,
} from "@/lib/storage";

const CharacterPreview = dynamic(
  () => import("@/components/three/CharacterPreview"),
  { ssr: false }
);

const CONTEXTOS = [
  {
    href: "/escuela",
    emoji: "🏫",
    label: "Escuela",
    subtexto: "Sala de clases y patio",
    color: "#4a9fd6",
  },
  {
    href: "/casa",
    emoji: "🏠",
    label: "Casa",
    subtexto: "Living, patio y habitaciones",
    color: "#c97b63",
  },
  {
    href: "/calle",
    emoji: "🚦",
    label: "Calle",
    subtexto: "Vereda, autos y plaza",
    color: "#5f7d95",
  },
  {
    href: "/terapia",
    emoji: "🧩",
    label: "Terapia",
    subtexto: "Centro de terapia",
    color: "#7a6db0",
  },
];

export default function Inicio() {
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [progreso, setProgreso] = useState<Progress>(DEFAULT_PROGRESS);

  useEffect(() => {
    setAvatar(storage.getAvatar());
    setProgreso(storage.getProgress());
  }, []);

  const totalReales = Object.values(progreso.hechosEnVidaReal).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <main className="pantalla">
      {/* Cabecera */}
      <div className="inicio-header">
        <h1 className="titulo-inicio">Mi Calma</h1>
        {totalReales > 0 && (
          <div className="logro-badge">
            <span>🌟</span>
            <span>{totalReales}</span>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="tarjeta avatar-card">
        <CharacterPreview config={avatar} height={200} />
        <Link href="/avatar" className="boton secundario boton-sm">
          ✏️ Cambiar personaje
        </Link>
      </div>

      {/* Pregunta */}
      <p className="subtitulo">¿Dónde quieres practicar hoy?</p>

      {/* Contextos 2×2 */}
      <div className="contextos-grid">
        {CONTEXTOS.map((ctx) => (
          <Link
            key={ctx.href}
            href={ctx.href}
            className="ctx-btn"
            style={{ background: ctx.color }}
          >
            <span className="ctx-emoji">{ctx.emoji}</span>
            <span className="ctx-label">{ctx.label}</span>
            <span className="ctx-subtexto">{ctx.subtexto}</span>
          </Link>
        ))}
      </div>

      {/* Logros */}
      {totalReales > 0 && (
        <div className="tarjeta logros-card">
          <div className="logros-numero">🌟 {totalReales}</div>
          <p className="logros-texto">
            {totalReales === 1 ? "ejercicio real" : "ejercicios que hiciste de verdad"}
            <br />
            <small>
              Cada vez que practicas en la vida real, tu calma se hace más fuerte.
            </small>
          </p>
        </div>
      )}

      {/* Pie */}
      <p className="nota-pie">
        <Link href="/pro">Profesionales</Link>
        {" · "}
        <Link href="/clinico">Configurar</Link>
        {" · "}
        <Link href="/escuela-2d">Versión 2D</Link>
      </p>
    </main>
  );
}
