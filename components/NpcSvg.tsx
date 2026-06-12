"use client";

// Personaje secundario (compañero o profesora), arte SVG plano provisional.

interface Props {
  piel: string;
  pelo: string;
  polera: string;
  size?: number;
  esAdulto?: boolean;
}

export default function NpcSvg({ piel, pelo, polera, size = 64, esAdulto = false }: Props) {
  const escala = esAdulto ? 1.25 : 1;
  return (
    <svg viewBox="0 0 80 120" width={size * escala} height={(size * 120 * escala) / 80}>
      {/* piernas */}
      <rect x="30" y="92" width="8" height="22" rx="4" fill="#52617a" />
      <rect x="42" y="92" width="8" height="22" rx="4" fill="#52617a" />
      {/* cuerpo */}
      <rect x="24" y="58" width="32" height="38" rx="12" fill={polera} />
      {/* brazos */}
      <rect x="17" y="62" width="7" height="26" rx="3.5" fill={polera} />
      <rect x="56" y="62" width="7" height="26" rx="3.5" fill={polera} />
      {/* cabeza */}
      <circle cx="40" cy="38" r="18" fill={piel} />
      <circle cx="33" cy="38" r="2.4" fill="#3a3a3a" />
      <circle cx="47" cy="38" r="2.4" fill="#3a3a3a" />
      <path d="M34 46 q6 5 12 0" stroke="#3a3a3a" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* pelo */}
      <path d="M22 37 q0 -18 18 -18 q18 0 18 18 q-4 -9 -18 -9 q-14 0 -18 9 z" fill={pelo} />
      {esAdulto && (
        <path d="M22 37 q0 -18 18 -18 q18 0 18 18 v14 q-4 4 -7 0 v-12 q-4 -7 -11 -7 q-7 0 -11 7 v12 q-3 4 -7 0 z" fill={pelo} />
      )}
    </svg>
  );
}
