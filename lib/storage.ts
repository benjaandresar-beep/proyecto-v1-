// Persistencia SOLO en el dispositivo (localStorage), decisión abierta #10 resuelta:
// el paquete del niño no guarda datos clínicos ni viaja a ningún servidor (frontera de datos, sección 2).

import { DEFAULT_EXERCISE_IDS } from "./exercises";

export interface AvatarConfig {
  piel: string;
  pelo: "corto" | "largo" | "rizado" | "coleta";
  colorPelo: string;
  polera: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  piel: "#e8b88a",
  pelo: "corto",
  colorPelo: "#5b4232",
  polera: "#4a9fd6",
};

export interface ClinicalConfig {
  /** Set de reguladores activos para este caso (salvaguarda 5.4) */
  ejercicios: string[];
  /** Intervalo en segundos para migración de burbujas y ruido fuerte (spec sugiere ~240s; demo más corto) */
  intervaloEventosSeg: number;
}

export const DEFAULT_CLINICAL: ClinicalConfig = {
  ejercicios: DEFAULT_EXERCISE_IDS,
  intervaloEventosSeg: 90,
};

export interface Progress {
  /** Veces que el niño dijo "sí, lo hice de verdad" por ejercicio (puente 3.5) */
  hechosEnVidaReal: Record<string, number>;
  sesiones: number;
  crisisVividas: number;
}

export const DEFAULT_PROGRESS: Progress = {
  hechosEnVidaReal: {},
  sesiones: 0,
  crisisVividas: 0,
};

const KEYS = {
  avatar: "regula:avatar",
  clinical: "regula:clinico",
  progress: "regula:progreso",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getAvatar: () => read<AvatarConfig>(KEYS.avatar, DEFAULT_AVATAR),
  setAvatar: (a: AvatarConfig) => write(KEYS.avatar, a),
  getClinical: () => read<ClinicalConfig>(KEYS.clinical, DEFAULT_CLINICAL),
  setClinical: (c: ClinicalConfig) => write(KEYS.clinical, c),
  getProgress: () => read<Progress>(KEYS.progress, DEFAULT_PROGRESS),
  setProgress: (p: Progress) => write(KEYS.progress, p),
  resetProgress: () => write(KEYS.progress, DEFAULT_PROGRESS),
};
