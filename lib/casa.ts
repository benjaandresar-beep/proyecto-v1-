// Mapa de la casa explorable (contexto Casa, Fase 2 ampliada).
// Una casa de un piso: habitación principal con tres puertas (patio al frente,
// pasillo derecho, pasillo izquierdo), y las áreas a las que llevan.
// Cada área usa todo el escenario; "arriba/izquierda/derecha" es la narrativa
// de navegación entre puertas, no la posición en pantalla.
// El patio tiene un sub-contexto: una fiesta tipo asado con invitados que
// traen sus propias emociones (misma mecánica de burbujas que el living).

import { EmotionId } from "./emotions";
import { AvatarConfig } from "./storage";

export type CasaArea =
  | "principal"
  | "patio"
  | "pasillo-der"
  | "hab-der-arriba"
  | "hab-der-abajo"
  | "pasillo-izq"
  | "tu-habitacion";

export interface PuertaDef {
  id: string;
  /** posición de la puerta en el escenario [x, z] */
  pos: [number, number];
  /** punto al que camina el niño antes de poder abrirla [x, z] */
  aprox: [number, number];
  /** rotación de la puerta en Y (orientación en el muro) */
  rotY: number;
  destino: CasaArea;
  label: string;
}

export interface AreaDef {
  id: CasaArea;
  nombre: string;
  /** color del piso */
  piso: string;
  /** dónde aparece el niño al entrar [x, z] */
  entrada: [number, number];
  puertas: PuertaDef[];
}

// puertas en el muro del fondo (z ≈ -4.8), el niño se acerca a z ≈ -3.2
const fondo = (x: number): { pos: [number, number]; aprox: [number, number]; rotY: number } => ({
  pos: [x, -4.8],
  aprox: [x, -3.1],
  rotY: 0,
});

export const CASA_AREAS: Record<CasaArea, AreaDef> = {
  principal: {
    id: "principal",
    nombre: "Living",
    piso: "#fcd34d",
    entrada: [0, 3.2],
    puertas: [
      { id: "a-patio", ...fondo(0), destino: "patio", label: "Patio (¡hay asado!)" },
      {
        id: "a-der",
        pos: [6.2, -0.5],
        aprox: [4.7, -0.5],
        rotY: Math.PI / 2,
        destino: "pasillo-der",
        label: "Pasillo derecha",
      },
      {
        id: "a-izq",
        pos: [-6.2, -0.5],
        aprox: [-4.7, -0.5],
        rotY: -Math.PI / 2,
        destino: "pasillo-izq",
        label: "Pasillo izquierda",
      },
    ],
  },

  patio: {
    id: "patio",
    nombre: "Patio — ¡Asado familiar! 🎉",
    piso: "#86efac",
    entrada: [0, 3.4],
    puertas: [{ id: "volver", ...fondo(-4.6), destino: "principal", label: "Volver adentro" }],
  },

  "pasillo-der": {
    id: "pasillo-der",
    nombre: "Pasillo derecho",
    piso: "#fde68a",
    entrada: [0, 3.4],
    puertas: [
      { id: "volver", ...fondo(-4.6), destino: "principal", label: "Volver al living" },
      { id: "d-arriba", ...fondo(0), destino: "hab-der-arriba", label: "Habitación 1" },
      { id: "d-abajo", ...fondo(4.6), destino: "hab-der-abajo", label: "Habitación 2" },
    ],
  },

  "hab-der-arriba": {
    id: "hab-der-arriba",
    nombre: "Habitación 1",
    piso: "#fde68a",
    entrada: [0, 3.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "pasillo-der", label: "Volver al pasillo" }],
  },

  "hab-der-abajo": {
    id: "hab-der-abajo",
    nombre: "Habitación 2",
    piso: "#fde68a",
    entrada: [0, 3.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "pasillo-der", label: "Volver al pasillo" }],
  },

  "pasillo-izq": {
    id: "pasillo-izq",
    nombre: "Pasillo izquierdo",
    piso: "#fde68a",
    entrada: [0, 3.4],
    puertas: [
      { id: "volver", ...fondo(-4.6), destino: "principal", label: "Volver al living" },
      { id: "i-mi-pieza", ...fondo(3), destino: "tu-habitacion", label: "Mi pieza" },
    ],
  },

  "tu-habitacion": {
    id: "tu-habitacion",
    nombre: "Mi pieza",
    piso: "#d8b4fe",
    entrada: [0, 3.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "pasillo-izq", label: "Volver al pasillo" }],
  },
};

// ---------- sub-contexto del patio: fiesta tipo asado ----------
// Invitados con sus emociones: la misma mecánica de burbujas del living,
// pero con más gente, música y estímulos propios de una celebración.

export interface InvitadoFiesta {
  id: string;
  nombre: string;
  piel: string;
  colorPelo: string;
  peloEstilo: AvatarConfig["pelo"];
  polera: string;
  /** posición en el patio [x, z] */
  pos: [number, number];
  esAdulto?: boolean;
}

export const INVITADOS_FIESTA: InvitadoFiesta[] = [
  // el parrillero, junto a la parrilla
  { id: "rafa", nombre: "Tío Rafa", piel: "#c98e5f", colorPelo: "#2b2b2b", peloEstilo: "corto", polera: "#e0503f", pos: [3.9, -2.3], esAdulto: true },
  { id: "norma", nombre: "Abuela Norma", piel: "#e8b88a", colorPelo: "#c9c9c9", peloEstilo: "coleta", polera: "#7a6db0", pos: [-0.8, -2.2], esAdulto: true },
  { id: "lila", nombre: "Tía Lila", piel: "#9c6a43", colorPelo: "#2b2b2b", peloEstilo: "largo", polera: "#9a6fd0", pos: [-2.6, -0.7], esAdulto: true },
  { id: "vale", nombre: "Vale", piel: "#f5d3b3", colorPelo: "#d6593f", peloEstilo: "largo", polera: "#56c5c5", pos: [2.2, -0.5] },
  { id: "max", nombre: "Max", piel: "#e8b88a", colorPelo: "#c98f3d", peloEstilo: "corto", polera: "#f2994a", pos: [-0.9, 1] },
  { id: "seba", nombre: "Primo Seba", piel: "#e8b88a", colorPelo: "#5b4232", peloEstilo: "rizado", polera: "#4a9fd6", pos: [3.7, 1.4] },
];

/** una burbuja por invitado: las 6 emociones del juego repartidas en la fiesta */
export const BURBUJAS_FIESTA: Record<string, EmotionId> = {
  rafa: "alegria",
  norma: "tristeza",
  lila: "calma",
  vale: "verguenza",
  max: "miedo",
  seba: "enojo",
};

export const LINEAS_FIESTA: Record<EmotionId, string> = {
  enojo: "¡Me sacaron el último choripán justo cuando lo iba a comer!",
  tristeza: "Mi mejor amiga no pudo venir al asado…",
  verguenza: "Se me cayó la bebida encima y todos me miraron.",
  miedo: "Hay mucha gente y mucho ruido… no conozco a todos.",
  alegria: "¡El asado está quedando delicioso! ¿Quieres probar un pedacito?",
  calma: "Sentémonos un ratito a mirar cómo sube el humito.",
};
