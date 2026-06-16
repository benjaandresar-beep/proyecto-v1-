// Mapa del contexto Calle explorable: la calle (sobrecarga sensorial urbana) con
// acceso a una plaza/parque con caminito, árboles, juegos (columpios, inflable,
// resbalín) y niños jugando con diálogos sobre emociones del juego.

import { EmotionId } from "./emotions";
import { AvatarConfig } from "./storage";
import { CONTEXTOS } from "./contexts";

export type CalleArea = "calle" | "plaza";

export interface PuertaDef {
  id: string;
  pos: [number, number];
  aprox: [number, number];
  rotY: number;
  destino: CalleArea;
  label: string;
}

export interface AreaDef {
  id: CalleArea;
  nombre: string;
  piso: string;
  entrada: [number, number];
  frame: number;
  limites: [number, number, number];
  puertas: PuertaDef[];
}

export const CALLE_AREAS: Record<CalleArea, AreaDef> = {
  calle: {
    id: "calle",
    nombre: "La calle",
    piso: "#cdc6ba",
    entrada: [0, 3.4],
    frame: 10,
    limites: [9, 0, 4.2], // el niño camina por la vereda (no entra a la calzada)
    puertas: [
      {
        id: "a-plaza",
        pos: [6.4, 1.2],
        aprox: [5, 1.2],
        rotY: Math.PI / 2,
        destino: "plaza",
        label: "Entrar a la plaza",
      },
    ],
  },
  plaza: {
    id: "plaza",
    nombre: "La plaza",
    piso: "#8fc46a",
    entrada: [0, 3.4],
    frame: 11,
    limites: [8.5, -4.4, 4.2],
    puertas: [
      {
        id: "volver",
        pos: [0, 4.7],
        aprox: [0, 3.5],
        rotY: Math.PI,
        destino: "calle",
        label: "Salir de la plaza",
      },
    ],
  },
};

// ---------- datos de la calle (reusa el contexto base) ----------

const CALLE = CONTEXTOS.calle;
export const CALLE_FIGURA = CALLE.figura; // Papá Marcos
export const CALLE_NPCS = CALLE.npcs;
export const CALLE_LINEAS = CALLE.lineas;
export const CALLE_BURBUJAS = CALLE.burbujasIniciales;
export const CALLE_POS = CALLE.posiciones;

// ---------- niños jugando en la plaza ----------

export interface NinoPlaza {
  id: string;
  nombre: string;
  piel: string;
  colorPelo: string;
  peloEstilo: AvatarConfig["pelo"];
  polera: string;
}

export const PLAZA_NINOS: NinoPlaza[] = [
  { id: "vicente", nombre: "Vicente", piel: "#e8b88a", colorPelo: "#2b2b2b", peloEstilo: "corto", polera: "#e0503f" },
  { id: "isi", nombre: "Isi", piel: "#f5d3b3", colorPelo: "#8a5a2b", peloEstilo: "coleta", polera: "#f2c24b" },
  { id: "mateo", nombre: "Mateo", piel: "#c98e5f", colorPelo: "#5b4232", peloEstilo: "rizado", polera: "#67c08a" },
  { id: "amanda", nombre: "Amanda", piel: "#9c6a43", colorPelo: "#2b2b2b", peloEstilo: "largo", polera: "#9a6fd0" },
  { id: "ben", nombre: "Ben", piel: "#e8b88a", colorPelo: "#c98f3d", peloEstilo: "corto", polera: "#4a9fd6" },
  { id: "clara", nombre: "Clara", piel: "#f5d3b3", colorPelo: "#d6593f", peloEstilo: "largo", polera: "#ee8fbb" },
];

// posiciones en la plaza (caminito central en x≈0; juegos al fondo)
export const PLAZA_POS: Record<string, [number, number]> = {
  vicente: [-2.6, 1.4],
  isi: [2.6, 0.6],
  mateo: [-3.2, -2.2],
  amanda: [3.2, -2.6],
  ben: [1.6, 2.6],
  clara: [-1.8, -0.4],
  papa: [2.6, 3],
};

export const PLAZA_BURBUJAS: Record<string, EmotionId> = {
  vicente: "enojo",
  isi: "alegria",
  mateo: "tristeza",
  amanda: "miedo",
  ben: "calma",
  clara: "verguenza",
};

// diálogos relacionados al juego (varias emociones)
export const PLAZA_LINEAS: Record<EmotionId, string> = {
  enojo: "¡Me empujaron en la fila del resbalín!",
  tristeza: "Nadie me pasa la pelota cuando juego…",
  verguenza: "Me caí del columpio y todos me miraron.",
  miedo: "El inflable es muy alto, me da susto saltar.",
  alegria: "¡Vamos juntos al resbalín, va a ser genial!",
  calma: "Descansemos un ratito en el pasto, ¿ya?",
};
