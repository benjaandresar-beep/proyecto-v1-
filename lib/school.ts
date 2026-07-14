// Contenido y reglas compartidas del contexto Escuela (usado por la escena 2D y la 3D).
// Los textos y pesos son provisionales: los valida el responsable clínico (sección 10).

import { LINEAS_ESCUELA } from "./dialogos";
import { ChargeMap, CHARGE_MAX, DISPLACENTERAS, EmotionId, totalCharge } from "./emotions";
import { AvatarConfig } from "./storage";

export interface NpcBase {
  id: string;
  nombre: string;
  piel: string;
  colorPelo: string;
  peloEstilo: AvatarConfig["pelo"];
  polera: string;
}

export const COMPANEROS_BASE: NpcBase[] = [
  { id: "martin", nombre: "Martín", piel: "#e8b88a", colorPelo: "#2b2b2b", peloEstilo: "corto", polera: "#e0503f" },
  { id: "sofia", nombre: "Sofía", piel: "#f5d3b3", colorPelo: "#8a5a2b", peloEstilo: "largo", polera: "#f2c24b" },
  { id: "tomas", nombre: "Tomás", piel: "#c98e5f", colorPelo: "#5b4232", peloEstilo: "rizado", polera: "#67c08a" },
  { id: "emilia", nombre: "Emilia", piel: "#9c6a43", colorPelo: "#2b2b2b", peloEstilo: "coleta", polera: "#9a6fd0" },
  { id: "lucas", nombre: "Lucas", piel: "#e8b88a", colorPelo: "#c98f3d", peloEstilo: "corto", polera: "#4a9fd6" },
  { id: "maite", nombre: "Maite", piel: "#f5d3b3", colorPelo: "#d6593f", peloEstilo: "largo", polera: "#ee8fbb" },
  { id: "diego", nombre: "Diego", piel: "#c98e5f", colorPelo: "#2b2b2b", peloEstilo: "rizado", polera: "#f2994a" },
  { id: "anto", nombre: "Anto", piel: "#e8b88a", colorPelo: "#5b4232", peloEstilo: "coleta", polera: "#56c5c5" },
];

export const PROFE_BASE: NpcBase = {
  id: "profe",
  nombre: "Profe Carmen",
  piel: "#e8b88a",
  colorPelo: "#5b4232",
  peloEstilo: "largo",
  polera: "#7a6db0",
};

// 7 burbujas iniciales: varias displacenteras + neutras/reguladoras (salvaguarda 5.2)
export const BURBUJAS_INICIALES: Record<string, EmotionId> = {
  martin: "enojo",
  sofia: "tristeza",
  tomas: "alegria",
  emilia: "verguenza",
  lucas: "miedo",
  maite: "calma",
  diego: "alegria",
};

// varias frases por emoción; ver lib/dialogos.ts
export const LINEAS_NPC = LINEAS_ESCUELA;

// Pesos internos provisionales, a calibrar con el responsable clínico
export const CARGA_POR_BURBUJA = 18;
export const CARGA_RUIDO = 8;
export const ALIVIO_AMIGO_CALMA = 8;
export const ALIVIO_EJERCICIO = 20;
export const RESPAWN_BURBUJA_MS = 25000;

export function sumarCarga(carga: ChargeMap, emocion: EmotionId, cantidad: number): ChargeMap {
  const total = totalCharge(carga);
  const espacio = Math.max(CHARGE_MAX - total, 0);
  const sumado = Math.min(cantidad, espacio);
  return { ...carga, [emocion]: (carga[emocion] ?? 0) + sumado };
}

/** Reduce el total en `cantidad`, repartida proporcionalmente entre las emociones acumuladas. */
export function reducirTotal(carga: ChargeMap, cantidad: number): ChargeMap {
  const total = totalCharge(carga);
  if (total <= 0) return carga;
  const factor = Math.max(total - cantidad, 0) / total;
  const nueva: ChargeMap = {};
  for (const id of DISPLACENTERAS) {
    const v = (carga[id] ?? 0) * factor;
    if (v > 0.5) nueva[id] = v;
  }
  return nueva;
}

/** Escala la carga para que el total quede en `objetivo`, conservando proporciones. */
export function escalarA(carga: ChargeMap, objetivo: number): ChargeMap {
  const total = totalCharge(carga);
  if (total <= 0) return carga;
  const factor = objetivo / total;
  const nueva: ChargeMap = {};
  for (const id of DISPLACENTERAS) {
    const v = (carga[id] ?? 0) * factor;
    if (v > 0.5) nueva[id] = v;
  }
  return nueva;
}
