"use client";

// Avatar 2D del niño, arte SVG plano provisional (reemplazable por ilustración final).
// La guatita muestra la acumulación cualitativa de emociones (interocepción, 3.3):
// los colores se apilan de abajo hacia arriba, sin números visibles.

import { ChargeMap, CHARGE_MAX, DISPLACENTERAS, EMOTIONS, totalCharge } from "@/lib/emotions";
import { AvatarConfig } from "@/lib/storage";

export type AvatarMood = "ok" | "cargado" | "abrumado" | "calma";

interface Props {
  config: AvatarConfig;
  charge?: ChargeMap;
  mood?: AvatarMood;
  size?: number;
}

export default function AvatarSvg({ config, charge = {}, mood = "ok", size = 120 }: Props) {
  const total = Math.min(totalCharge(charge), CHARGE_MAX);

  // Segmentos de color apilados en la guatita, proporcionales a cada emoción acumulada
  const bellyTop = 88;
  const bellyBottom = 124;
  const bellyHeight = bellyBottom - bellyTop;
  let y = bellyBottom;
  const segments = DISPLACENTERAS.flatMap((id) => {
    const v = charge[id] ?? 0;
    if (v <= 0) return [];
    const h = (v / CHARGE_MAX) * bellyHeight;
    y -= h;
    return [{ color: EMOTIONS[id].color, y, h }];
  });

  const eyes =
    mood === "abrumado" ? (
      <>
        <path d="M50 50 l8 4 M58 50 l-8 4" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none" transform="translate(-6 0)" />
        <path d="M68 54 l8 -4 M68 50 l8 4" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </>
    ) : mood === "calma" ? (
      <>
        <path d="M44 52 q5 4 10 0" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M66 52 q5 4 10 0" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </>
    ) : (
      <>
        <circle cx="49" cy="52" r="3.5" fill="#3a3a3a" />
        <circle cx="71" cy="52" r="3.5" fill="#3a3a3a" />
      </>
    );

  const mouth =
    mood === "abrumado" ? (
      <path d="M52 70 q8 -7 16 0" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    ) : mood === "cargado" ? (
      <path d="M52 69 h16" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    ) : (
      <path d="M50 66 q10 9 20 0" stroke="#3a3a3a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    );

  return (
    <svg
      viewBox="0 0 120 170"
      width={size}
      height={(size * 170) / 120}
      className={mood === "abrumado" ? "avatar-shake" : undefined}
      aria-label="Tu personaje"
    >
      <defs>
        <clipPath id="belly-clip">
          <ellipse cx="60" cy="106" rx="20" ry="18" />
        </clipPath>
      </defs>

      {/* piernas */}
      <rect x="46" y="130" width="11" height="32" rx="5" fill="#3f5a78" />
      <rect x="63" y="130" width="11" height="32" rx="5" fill="#3f5a78" />
      <ellipse cx="51" cy="164" rx="9" ry="5" fill="#6b4f3a" />
      <ellipse cx="69" cy="164" rx="9" ry="5" fill="#6b4f3a" />

      {/* brazos */}
      <rect x="26" y="88" width="10" height="34" rx="5" fill={config.polera} />
      <rect x="84" y="88" width="10" height="34" rx="5" fill={config.polera} />
      <circle cx="31" cy="124" r="6" fill={config.piel} />
      <circle cx="89" cy="124" r="6" fill={config.piel} />

      {/* cuerpo / polera */}
      <rect x="36" y="82" width="48" height="52" rx="16" fill={config.polera} />

      {/* guatita: zona de acumulación emocional */}
      <ellipse cx="60" cy="106" rx="20" ry="18" fill="#ffffff" opacity="0.85" />
      <g clipPath="url(#belly-clip)">
        {segments.map((s, i) => (
          <rect key={i} x="38" y={s.y} width="44" height={s.h + 1} fill={s.color} opacity="0.9" />
        ))}
      </g>
      <ellipse
        cx="60"
        cy="106"
        rx="20"
        ry="18"
        fill="none"
        stroke={total >= 75 ? "#e0503f" : "#c9bfae"}
        strokeWidth={total >= 75 ? 3 : 2}
        strokeDasharray="4 3"
        opacity="0.9"
      />

      {/* cabeza */}
      <circle cx="60" cy="52" r="26" fill={config.piel} />
      {eyes}
      {mouth}

      {/* pelo */}
      {config.pelo === "corto" && (
        <path d="M34 50 q0 -26 26 -26 q26 0 26 26 q-6 -12 -26 -12 q-20 0 -26 12 z" fill={config.colorPelo} />
      )}
      {config.pelo === "largo" && (
        <path d="M34 50 q0 -26 26 -26 q26 0 26 26 v22 q-5 6 -10 0 v-18 q-5 -10 -16 -10 q-11 0 -16 10 v18 q-5 6 -10 0 z" fill={config.colorPelo} />
      )}
      {config.pelo === "rizado" && (
        <g fill={config.colorPelo}>
          <circle cx="42" cy="36" r="10" />
          <circle cx="55" cy="29" r="11" />
          <circle cx="69" cy="30" r="10" />
          <circle cx="79" cy="39" r="9" />
          <circle cx="36" cy="46" r="8" />
          <circle cx="84" cy="49" r="7" />
        </g>
      )}
      {config.pelo === "coleta" && (
        <g fill={config.colorPelo}>
          <path d="M34 50 q0 -26 26 -26 q26 0 26 26 q-6 -12 -26 -12 q-20 0 -26 12 z" />
          <circle cx="86" cy="32" r="6" />
          <path d="M86 32 q12 10 8 30 q-6 4 -8 -2 q3 -16 -4 -24 z" />
        </g>
      )}
    </svg>
  );
}
