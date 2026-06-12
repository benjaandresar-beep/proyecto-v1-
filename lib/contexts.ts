// Definición de los tres contextos del juego (sección 4 de la spec).
// Escuela = MVP (4.1); Casa (4.2) y Calle (4.3) = Fase 2.
// Textos y personajes provisionales: los valida el responsable clínico.

import { EmotionId } from "./emotions";
import {
  BURBUJAS_INICIALES,
  COMPANEROS_BASE,
  LINEAS_NPC,
  NpcBase,
  PROFE_BASE,
} from "./school";

export type ContextoId = "escuela" | "casa" | "calle";

export interface FiguraApoyo extends NpcBase {
  /** cómo se le nombra dentro de una frase: "la profe", "mamá", "papá" */
  rolCorto: string;
  /** frase de compañía durante la crisis: "La profe está contigo." */
  frasePresencia: string;
}

export interface ContextDef {
  id: ContextoId;
  nombre: string;
  emoji: string;
  npcs: NpcBase[];
  figura: FiguraApoyo;
  burbujasIniciales: Record<string, EmotionId>;
  lineas: Record<EmotionId, string>;
  /** posición [x, z] de cada personaje (id del NPC o de la figura) */
  posiciones: Record<string, [number, number]>;
  evento: { titulo: string; aviso: string };
  /** multiplicador del intervalo del estímulo ambiental (Calle = más frecuente, 4.3) */
  factorIntervalo: number;
  /** los NPC cambian de posición con la migración: "el escenario se siente en movimiento" (4.3) */
  escenarioMovil: boolean;
  /** herramienta de audífonos disponible para reducir el estímulo (4.3) */
  conAudifonos: boolean;
  /** límite frontal del área caminable (la Calle restringe a la vereda) */
  zMin: number;
  /** a quiénes va a conocer el niño, para el bloque de asentimiento (5.1) */
  asentimientoQuienes: string;
}

// ---------- Casa (4.2): hermanos, ruidos del hogar, cambios de plan ----------

const FAMILIA: NpcBase[] = [
  { id: "pedro", nombre: "Pedro", piel: "#e8b88a", colorPelo: "#2b2b2b", peloEstilo: "corto", polera: "#e0503f" },
  { id: "carla", nombre: "Carla", piel: "#f5d3b3", colorPelo: "#8a5a2b", peloEstilo: "coleta", polera: "#f2c24b" },
  { id: "nico", nombre: "Nico", piel: "#c98e5f", colorPelo: "#5b4232", peloEstilo: "rizado", polera: "#67c08a" },
  { id: "lila", nombre: "Tía Lila", piel: "#9c6a43", colorPelo: "#2b2b2b", peloEstilo: "largo", polera: "#9a6fd0" },
  { id: "vale", nombre: "Vale", piel: "#f5d3b3", colorPelo: "#d6593f", peloEstilo: "largo", polera: "#56c5c5" },
  { id: "max", nombre: "Max", piel: "#e8b88a", colorPelo: "#c98f3d", peloEstilo: "corto", polera: "#f2994a" },
];

const LINEAS_CASA: Record<EmotionId, string> = {
  enojo: "¡Me cambiaron el canal justo en lo mejor!",
  tristeza: "Se canceló el paseo que esperaba toda la semana…",
  verguenza: "Boté el vaso de jugo en la mesa y todos miraron.",
  miedo: "Hay un ruido raro en la casa y no sé qué es…",
  alegria: "¡Vamos a hacer galletas! ¿Me ayudas a mezclar?",
  calma: "¿Miramos las nubes por la ventana un ratito?",
};

// ---------- Calle (4.3): estímulos urbanos, transeúntes, sobrecarga sensorial ----------

const TRANSEUNTES: NpcBase[] = [
  { id: "rosa", nombre: "Vecina Rosa", piel: "#f5d3b3", colorPelo: "#7a7a7a", peloEstilo: "largo", polera: "#67c08a" },
  { id: "juan", nombre: "Juan", piel: "#c98e5f", colorPelo: "#2b2b2b", peloEstilo: "corto", polera: "#4a9fd6" },
  { id: "luis", nombre: "Don Luis", piel: "#9c6a43", colorPelo: "#5b4232", peloEstilo: "corto", polera: "#e0503f" },
  { id: "pati", nombre: "Sra. Pati", piel: "#e8b88a", colorPelo: "#8a5a2b", peloEstilo: "coleta", polera: "#ee8fbb" },
  { id: "leo", nombre: "Leo", piel: "#e8b88a", colorPelo: "#d6593f", peloEstilo: "rizado", polera: "#f2c24b" },
  { id: "ema", nombre: "Ema", piel: "#f5d3b3", colorPelo: "#2b2b2b", peloEstilo: "coleta", polera: "#9a6fd0" },
];

const LINEAS_CALLE: Record<EmotionId, string> = {
  enojo: "¡Esa bicicleta casi me pasa por encima!",
  tristeza: "Se me fue la micro y voy a llegar tarde…",
  verguenza: "Me tropecé en la esquina delante de todos.",
  miedo: "¡Cuánto ruido hay hoy en la calle!",
  alegria: "¡Mira, hay un perrito amistoso en la plaza!",
  calma: "Caminemos despacito por la sombra, sin apuro.",
};

// ---------- catálogo ----------

export const CONTEXTOS: Record<ContextoId, ContextDef> = {
  escuela: {
    id: "escuela",
    nombre: "Escuela",
    emoji: "🏫",
    npcs: COMPANEROS_BASE,
    figura: {
      ...PROFE_BASE,
      rolCorto: "la profe",
      frasePresencia: "La profe está contigo.",
    },
    burbujasIniciales: BURBUJAS_INICIALES,
    lineas: LINEAS_NPC,
    posiciones: {
      martin: [-5, 1],
      sofia: [-2.5, 3.2],
      tomas: [0.8, 0.8],
      emilia: [3, 3.4],
      lucas: [5.2, 0.2],
      maite: [1.8, -2.2],
      diego: [-4.6, 3.8],
      anto: [5.6, 3.6],
      profe: [-2.2, -3.6],
    },
    evento: { titulo: "💥 ¡RUIDO FUERTE!", aviso: "¡Eso fue un ruido fuerte! Tu cuerpo lo sintió." },
    factorIntervalo: 1,
    escenarioMovil: false,
    conAudifonos: false,
    zMin: -3.6,
    asentimientoQuienes: "tus compañeros",
  },

  casa: {
    id: "casa",
    nombre: "Casa",
    emoji: "🏠",
    npcs: FAMILIA,
    figura: {
      id: "mama",
      nombre: "Mamá Andrea",
      piel: "#e8b88a",
      colorPelo: "#5b4232",
      peloEstilo: "largo",
      polera: "#c4584f",
      rolCorto: "mamá",
      frasePresencia: "Mamá está contigo.",
    },
    burbujasIniciales: {
      pedro: "enojo",
      carla: "tristeza",
      vale: "verguenza",
      max: "miedo",
      nico: "alegria",
      lila: "calma",
    },
    lineas: LINEAS_CASA,
    posiciones: {
      pedro: [-4.5, 1],
      carla: [3.5, 3],
      nico: [0.5, 0.6],
      lila: [5, 0.8],
      vale: [-2.5, 3.4],
      max: [-5.4, 3.8],
      mama: [1.8, -3.4],
    },
    evento: { titulo: "📺 ¡RUIDO EN CASA!", aviso: "¡La casa se puso ruidosa de repente! Tu cuerpo lo sintió." },
    factorIntervalo: 1,
    escenarioMovil: false,
    conAudifonos: false,
    zMin: -3.6,
    asentimientoQuienes: "tu familia",
  },

  calle: {
    id: "calle",
    nombre: "Calle",
    emoji: "🚦",
    npcs: TRANSEUNTES,
    figura: {
      id: "papa",
      nombre: "Papá Marcos",
      piel: "#c98e5f",
      colorPelo: "#2b2b2b",
      peloEstilo: "corto",
      polera: "#3f5a78",
      rolCorto: "papá",
      frasePresencia: "Papá está contigo, de la mano.",
    },
    burbujasIniciales: {
      luis: "enojo",
      pati: "tristeza",
      juan: "miedo",
      ema: "verguenza",
      leo: "alegria",
      rosa: "calma",
    },
    lineas: LINEAS_CALLE,
    posiciones: {
      rosa: [-5, 2.2],
      juan: [-2, 3.6],
      luis: [0.8, 1.2],
      pati: [3, 3.2],
      leo: [5.4, 1.6],
      ema: [-3.8, 0.7],
      papa: [-1.2, 3.9],
    },
    evento: { titulo: "📢 ¡BOCINAZO!", aviso: "¡Una bocina sonó muy fuerte! Tu cuerpo lo sintió." },
    factorIntervalo: 0.5, // mayor densidad de estímulos que los otros contextos (4.3)
    escenarioMovil: true,
    conAudifonos: true,
    zMin: 0, // el niño camina solo por la vereda
    asentimientoQuienes: "las personas de la calle",
  },
};
