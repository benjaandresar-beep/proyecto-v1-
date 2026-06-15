// Mapa del centro de terapia explorable (contexto Terapia).
// Patio con reja → recepción (pacientes + psicólogo de apoyo) → tres salas:
// Psicología, Fonoaudiología y Terapia Ocupacional, cada una con su terapeuta.

export type TerapiaArea =
  | "patio"
  | "recepcion"
  | "psicologia"
  | "fonoaudiologia"
  | "terapia-ocupacional";

export interface PuertaDef {
  id: string;
  pos: [number, number];
  aprox: [number, number];
  rotY: number;
  destino: TerapiaArea;
  label: string;
}

export interface AreaDef {
  id: TerapiaArea;
  nombre: string;
  piso: string;
  entrada: [number, number];
  frame: number;
  limites: [number, number, number]; // [xMax, zMin, zMax]
  puertas: PuertaDef[];
}

const fondo = (x: number): { pos: [number, number]; aprox: [number, number]; rotY: number } => ({
  pos: [x, -4.8],
  aprox: [x, -3.1],
  rotY: 0,
});

export const TERAPIA_AREAS: Record<TerapiaArea, AreaDef> = {
  patio: {
    id: "patio",
    nombre: "Patio de entrada",
    piso: "#9ccb6a",
    entrada: [0, 3.4],
    frame: 9,
    limites: [7.5, -3, 4.2],
    puertas: [{ id: "a-casa", ...fondo(0), destino: "recepcion", label: "Entrar a la casa" }],
  },
  recepcion: {
    id: "recepcion",
    nombre: "Recepción",
    piso: "#e3d3c0",
    entrada: [0, 3.4],
    frame: 7.8,
    limites: [6, -3, 4.2],
    puertas: [
      { id: "p-psico", ...fondo(-4.4), destino: "psicologia", label: "Sala de Psicología" },
      { id: "p-fono", ...fondo(0), destino: "fonoaudiologia", label: "Sala de Fonoaudiología" },
      { id: "p-to", ...fondo(4.4), destino: "terapia-ocupacional", label: "Sala de Terapia Ocupacional" },
      {
        id: "volver",
        pos: [-6.2, 2.4],
        aprox: [-4.8, 2.4],
        rotY: -Math.PI / 2,
        destino: "patio",
        label: "Salir al patio",
      },
    ],
  },
  psicologia: {
    id: "psicologia",
    nombre: "Sala de Psicología",
    piso: "#d9c9e0",
    entrada: [0, 3.2],
    frame: 7.2,
    limites: [6, -3, 4.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "recepcion", label: "Volver a recepción" }],
  },
  fonoaudiologia: {
    id: "fonoaudiologia",
    nombre: "Sala de Fonoaudiología",
    piso: "#cfe0e8",
    entrada: [0, 3.2],
    frame: 7.2,
    limites: [6, -3, 4.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "recepcion", label: "Volver a recepción" }],
  },
  "terapia-ocupacional": {
    id: "terapia-ocupacional",
    nombre: "Sala de Terapia Ocupacional",
    piso: "#e8dcc0",
    entrada: [0, 3.4],
    frame: 8,
    limites: [7, -3.5, 4.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "recepcion", label: "Volver a recepción" }],
  },
};

// ---------- personajes ----------

import { AvatarConfig } from "./storage";
import { EmotionId } from "./emotions";

export interface PersonajeTerapia {
  id: string;
  nombre: string;
  piel: string;
  colorPelo: string;
  peloEstilo: AvatarConfig["pelo"];
  polera: string;
  esAdulto?: boolean;
  /** figura de apoyo: conversar baja la carga (psicólogo y terapeutas) */
  esApoyo?: boolean;
  /** rol corto para frases: "el psicólogo", "la fono"… */
  rol?: string;
  frasePresencia?: string;
}

// pacientes (NNA) en la recepción, con burbujas
export const PACIENTES: PersonajeTerapia[] = [
  { id: "benja", nombre: "Benja", piel: "#e8b88a", colorPelo: "#2b2b2b", peloEstilo: "corto", polera: "#e0503f" },
  { id: "flor", nombre: "Flor", piel: "#f5d3b3", colorPelo: "#8a5a2b", peloEstilo: "coleta", polera: "#f2c24b" },
  { id: "tin", nombre: "Agustín", piel: "#c98e5f", colorPelo: "#5b4232", peloEstilo: "rizado", polera: "#67c08a" },
  { id: "sol", nombre: "Sol", piel: "#9c6a43", colorPelo: "#2b2b2b", peloEstilo: "largo", polera: "#9a6fd0" },
];

// un familiar acompañando (sin burbuja, no es apoyo)
export const FAMILIAR: PersonajeTerapia = {
  id: "fam",
  nombre: "Una mamá",
  piel: "#e8b88a",
  colorPelo: "#5b4232",
  peloEstilo: "largo",
  polera: "#56c5c5",
  esAdulto: true,
};

// psicólogo que espera en recepción (figura de apoyo principal)
export const PSICOLOGO: PersonajeTerapia = {
  id: "psicologo",
  nombre: "Tío Pablo",
  piel: "#c98e5f",
  colorPelo: "#2b2b2b",
  peloEstilo: "corto",
  polera: "#3f6f9a",
  esAdulto: true,
  esApoyo: true,
  rol: "el psicólogo",
  frasePresencia: "El psicólogo está contigo.",
};

// terapeutas de cada sala (figuras de apoyo)
export const TERAPEUTAS: Record<string, PersonajeTerapia> = {
  psicologia: {
    id: "ter-psi",
    nombre: "Tía Rosa",
    piel: "#f5d3b3",
    colorPelo: "#8a5a2b",
    peloEstilo: "largo",
    polera: "#9a6fd0",
    esAdulto: true,
    esApoyo: true,
    rol: "la psicóloga",
    frasePresencia: "La psicóloga está contigo.",
  },
  fonoaudiologia: {
    id: "ter-fono",
    nombre: "Tío Diego",
    piel: "#9c6a43",
    colorPelo: "#2b2b2b",
    peloEstilo: "corto",
    polera: "#4a9fd6",
    esAdulto: true,
    esApoyo: true,
    rol: "el fono",
    frasePresencia: "El fono está contigo.",
  },
  "terapia-ocupacional": {
    id: "ter-to",
    nombre: "Tía Cami",
    piel: "#e8b88a",
    colorPelo: "#d6593f",
    peloEstilo: "coleta",
    polera: "#67c08a",
    esAdulto: true,
    esApoyo: true,
    rol: "la tía de T.O.",
    frasePresencia: "La tía de T.O. está contigo.",
  },
};

export const LINEAS_TERAPIA: Record<EmotionId, string> = {
  enojo: "¡No quería dejar el juego que estaba armando!",
  tristeza: "Echo de menos a mi mamá mientras espero…",
  verguenza: "Me da vergüenza cuando me toca hablar en la sesión.",
  miedo: "Entrar a una sala nueva me pone nervioso.",
  alegria: "¡Hoy toca jugar con plasticina en T.O.!",
  calma: "Respiremos juntos un ratito mientras esperamos.",
};

export const BURBUJAS_RECEPCION: Record<string, EmotionId> = {
  benja: "enojo",
  flor: "tristeza",
  tin: "alegria",
  sol: "miedo",
};
