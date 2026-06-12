// Código cromático de emociones (convención tipo "Intensamente", sección 3.2 de la spec).
// Los colores y emociones definitivos los valida el responsable clínico.

export type EmotionId =
  | "enojo"
  | "tristeza"
  | "verguenza"
  | "miedo"
  | "alegria"
  | "calma";

export interface Emotion {
  id: EmotionId;
  nombre: string;
  color: string;
  colorSuave: string;
  /** true = sube la carga al interactuar; false = neutra o reguladora (salvaguarda 5.2) */
  displacentera: boolean;
}

export const EMOTIONS: Record<EmotionId, Emotion> = {
  enojo: {
    id: "enojo",
    nombre: "enojo",
    color: "#e0503f",
    colorSuave: "#f6c4bd",
    displacentera: true,
  },
  tristeza: {
    id: "tristeza",
    nombre: "tristeza",
    color: "#4a7dd6",
    colorSuave: "#c4d4f3",
    displacentera: true,
  },
  verguenza: {
    id: "verguenza",
    nombre: "vergüenza",
    color: "#ee8fbb",
    colorSuave: "#f9d5e6",
    displacentera: true,
  },
  miedo: {
    id: "miedo",
    nombre: "miedo",
    color: "#9a6fd0",
    colorSuave: "#ddcdf2",
    displacentera: true,
  },
  alegria: {
    id: "alegria",
    nombre: "alegría",
    color: "#f2c24b",
    colorSuave: "#fae9c0",
    displacentera: false,
  },
  calma: {
    id: "calma",
    nombre: "calma",
    color: "#67c08a",
    colorSuave: "#cdead9",
    displacentera: false,
  },
};

export const DISPLACENTERAS: EmotionId[] = [
  "enojo",
  "tristeza",
  "verguenza",
  "miedo",
];

/** Carga acumulada por emoción displacentera (interocepción, 3.3). Sin números visibles para el niño. */
export type ChargeMap = Partial<Record<EmotionId, number>>;

export const CHARGE_MAX = 100;

export function totalCharge(charge: ChargeMap): number {
  return Object.values(charge).reduce((a, b) => a + (b ?? 0), 0);
}
