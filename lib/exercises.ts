// Repertorio curado de reguladores (sección 3.4 y 5.4 de la spec).
// El contenido definitivo lo cura el responsable clínico; esta lista es provisional.
// La salvaguarda 5.4 exige que el set activo sea configurable por caso (ver /clinico).

export type ExerciseIntensity = "intenso" | "suave";

export interface Exercise {
  id: string;
  nombre: string;
  /** Instrucción en lenguaje de niño, ejecutable en la vida real (puente 3.5) */
  instruccion: string;
  emoji: string;
  /** intenso = input propioceptivo fuerte (perfil buscador); suave = bajo estímulo (perfil hipersensible) */
  intensidad: ExerciseIntensity;
}

export const EXERCISE_LIBRARY: Exercise[] = [
  {
    id: "respirar",
    nombre: "Respirar profundo",
    instruccion: "Toma aire por la nariz contando hasta 4 y suéltalo despacito por la boca.",
    emoji: "🌬️",
    intensidad: "suave",
  },
  {
    id: "saltar",
    nombre: "Saltar como estrella",
    instruccion: "Salta 10 veces abriendo brazos y piernas como una estrella.",
    emoji: "⭐",
    intensidad: "intenso",
  },
  {
    id: "empujar-pared",
    nombre: "Empujar la pared",
    instruccion: "Pon las manos en la pared y empuja fuerte contando hasta 10.",
    emoji: "🧱",
    intensidad: "intenso",
  },
  {
    id: "correr-sitio",
    nombre: "Correr en el sitio",
    instruccion: "Corre sin moverte del lugar, levantando bien las rodillas, hasta contar 20.",
    emoji: "🏃",
    intensidad: "intenso",
  },
  {
    id: "apretar-manos",
    nombre: "Apretar y soltar las manos",
    instruccion: "Aprieta fuerte los puños contando hasta 5 y suéltalos despacio. Repite 3 veces.",
    emoji: "✊",
    intensidad: "suave",
  },
  {
    id: "tomar-agua",
    nombre: "Tomar agua",
    instruccion: "Toma un vaso de agua despacio, sorbo a sorbo.",
    emoji: "💧",
    intensidad: "suave",
  },
  {
    id: "estirarse",
    nombre: "Estirarse como gato",
    instruccion: "Estira los brazos bien arriba y luego tócate la punta de los pies, como un gato que despierta.",
    emoji: "🐱",
    intensidad: "suave",
  },
];

/** Set por defecto si el modo clínico no ha configurado uno (mezcla intensos y suaves). */
export const DEFAULT_EXERCISE_IDS = [
  "respirar",
  "saltar",
  "empujar-pared",
  "apretar-manos",
];
