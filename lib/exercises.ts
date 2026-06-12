// Biblioteca curada de ejercicios de regulación (sección 3.4 y 5.4 de la spec,
// y documento clínico "Biblioteca de ejercicios de regulación v1").
//
// DECISIÓN ESTRUCTURAL: la biblioteca NO se organiza por diagnóstico, sino por
// MECANISMO (familias A–E), por el ESTADO que regula (hiper/hipoactivación) y
// por su SEGURIDAD según el perfil sensorial. El clínico arma el set de cada
// niño según el perfil que evaluó, no según su etiqueta diagnóstica.
//
// El contenido y las referencias formales los cura el responsable clínico.

export type ExerciseIntensity = "intenso" | "suave";

/** Arquetipo de animación que ejecuta el personaje 3D al practicar el ejercicio */
export type ExerciseAnimation =
  | "salto"
  | "correr"
  | "empujar"
  | "calma"
  | "abrazo"
  | "balanceo"
  | "marcha";

/** Familia por mecanismo (documento clínico, familias A–E) */
export type Familia = "propioceptivo" | "vestibular" | "respiratorio" | "cognitivo" | "sensorial";

/** Estado de activación que regula: bajar hiperactivación (↓) o subir desde hipoactivación (↑) */
export type EstadoRegulado = "bajar" | "subir" | "neutro";

/** Seguridad por perfil: transversal (sirve a casi todos) o precaución (depende del perfil/estado) */
export type Seguridad = "transversal" | "precaucion";

export type ContextoEjercicio = "escuela" | "casa" | "calle";

export interface Exercise {
  id: string;
  nombre: string;
  /** Instrucción en lenguaje de niño, ejecutable en la vida real (puente 3.5) */
  instruccion: string;
  emoji: string;
  familia: Familia;
  /** intenso = input fuerte (perfil buscador); suave = bajo estímulo (perfil hipersensible) */
  intensidad: ExerciseIntensity;
  estado: EstadoRegulado;
  seguridad: Seguridad;
  contextos: ContextoEjercicio[];
  animacion: ExerciseAnimation;
}

export const FAMILIAS: Record<Familia, { letra: string; nombre: string; descripcion: string }> = {
  propioceptivo: {
    letra: "A",
    nombre: "Propioceptivos / trabajo pesado",
    descripcion:
      "Presión profunda y esfuerzo muscular. La familia más segura: organiza y calma a casi todos los perfiles. Base recomendada de cualquier set.",
  },
  vestibular: {
    letra: "B",
    nombre: "Vestibulares / movimiento",
    descripcion:
      "Movimiento. El lento calma; el intenso (saltos, correr) ALERTA. Usar con precaución en niños hipersensibles o ya hiperactivados.",
  },
  respiratorio: {
    letra: "C",
    nombre: "Respiratorios e interoceptivos",
    descripcion:
      "Respiración y conciencia corporal. Generalmente seguros y calmantes. El escaneo corporal conecta con la guatita del juego.",
  },
  cognitivo: {
    letra: "D",
    nombre: "Cognitivo-psicológicos",
    descripcion:
      "Estrategias verbales y de pensamiento. Seguras. Incluyen nombrar la emoción y pedir ayuda, que el juego ya integra.",
  },
  sensorial: {
    letra: "E",
    nombre: "Reductores de input sensorial",
    descripcion:
      "Acciones para reducir el estímulo que entra. Claves para perfiles hipersensibles y para el contexto Calle.",
  },
};

const E: ContextoEjercicio[] = ["escuela"];
const ECA: ContextoEjercicio[] = ["escuela", "casa"];
const TODOS: ContextoEjercicio[] = ["escuela", "casa", "calle"];

export const EXERCISE_LIBRARY: Exercise[] = [
  // ---------- Familia A · Propioceptivos / trabajo pesado ----------
  {
    id: "empujar-pared",
    nombre: "Empujar la pared",
    instruccion: "Apoya las manos y empuja fuerte 10 segundos, como si quisieras moverla.",
    emoji: "🧱",
    familia: "propioceptivo",
    intensidad: "intenso",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "empujar",
  },
  {
    id: "apretar-manos",
    nombre: "Apretar las manos / pelota",
    instruccion: "Aprieta una pelotita o tus propias manos, cuenta hasta 10 y suelta.",
    emoji: "✊",
    familia: "propioceptivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "abrazo-oso",
    nombre: "Abrazo de oso",
    instruccion: "Cruza los brazos y date un abrazo apretado, o pide uno fuerte.",
    emoji: "🤗",
    familia: "propioceptivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ECA,
    animacion: "abrazo",
  },
  {
    id: "llevar-pesado",
    nombre: "Llevar algo pesado",
    instruccion: "Carga la mochila, unos libros o una bolsa de un lado a otro.",
    emoji: "🎒",
    familia: "propioceptivo",
    intensidad: "intenso",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ECA,
    animacion: "marcha",
  },
  {
    id: "empujar-tirar",
    nombre: "Empujar o tirar",
    instruccion: "Empuja una silla pesada o tira de algo firme con fuerza.",
    emoji: "💪",
    familia: "propioceptivo",
    intensidad: "intenso",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ECA,
    animacion: "empujar",
  },
  {
    id: "tensar-soltar",
    nombre: "Tensar y soltar",
    instruccion: "Aprieta todos los músculos como una estatua, cuenta 5 y suéltate como gelatina.",
    emoji: "🗿",
    familia: "propioceptivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "abrazo",
  },

  // ---------- Familia B · Vestibulares / movimiento ----------
  {
    id: "saltar",
    nombre: "Saltar / saltos de tijera",
    instruccion: "Salta en el sitio varias veces, lo más alto que puedas.",
    emoji: "⭐",
    familia: "vestibular",
    intensidad: "intenso",
    estado: "subir",
    seguridad: "precaucion",
    contextos: ECA,
    animacion: "salto",
  },
  {
    id: "correr-sitio",
    nombre: "Correr en el sitio",
    instruccion: "Corre sin moverte del lugar contando hasta 20.",
    emoji: "🏃",
    familia: "vestibular",
    intensidad: "intenso",
    estado: "subir",
    seguridad: "precaucion",
    contextos: ECA,
    animacion: "correr",
  },
  {
    id: "balanceo",
    nombre: "Balanceo lento",
    instruccion: "Mécete despacio de un lado a otro, suave, con un ritmo lento.",
    emoji: "🌊",
    familia: "vestibular",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ["casa"],
    animacion: "balanceo",
  },
  {
    id: "marcha-ritmica",
    nombre: "Marcha rítmica",
    instruccion: "Camina marcando un ritmo lento y parejo, contando los pasos.",
    emoji: "🥁",
    familia: "vestibular",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "marcha",
  },

  // ---------- Familia C · Respiratorios e interoceptivos ----------
  {
    id: "respirar",
    nombre: "Respiración del globo",
    instruccion: "Infla la panza como un globo al tomar aire, desínflala despacio al soltar.",
    emoji: "🎈",
    familia: "respiratorio",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "respiracion-cuadrada",
    nombre: "Respiración cuadrada",
    instruccion: "Inhala 4, mantén 4, exhala 4, espera 4. Dibuja un cuadrado con el dedo.",
    emoji: "⬜",
    familia: "respiratorio",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "soplar-vela",
    nombre: "Soplar la vela",
    instruccion: "Sopla lento y largo, como apagando una vela sin que se apague de golpe.",
    emoji: "🕯️",
    familia: "respiratorio",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "donde-lo-siento",
    nombre: "¿Dónde lo siento?",
    instruccion: "Cierra los ojos y busca en qué parte del cuerpo está la emoción ahora.",
    emoji: "🫶",
    familia: "respiratorio",
    intensidad: "suave",
    estado: "neutro",
    seguridad: "transversal",
    contextos: ECA,
    animacion: "calma",
  },

  // ---------- Familia D · Cognitivo-psicológicos ----------
  {
    id: "ponerle-nombre",
    nombre: "Ponerle nombre",
    instruccion: "Dile en voz baja o por dentro qué emoción es: «esto es rabia», «esto es susto».",
    emoji: "🏷️",
    familia: "cognitivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "contar-lo-que-pasa",
    nombre: "Contar lo que pasa",
    instruccion: "Cuéntale a un adulto de confianza cómo te sientes y qué pasó.",
    emoji: "💬",
    familia: "cognitivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "frase-calma",
    nombre: "Frase de calma",
    instruccion: "Repítete una frase que ayude: «esto va a pasar», «puedo esperar».",
    emoji: "🗯️",
    familia: "cognitivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "pedir-pausa",
    nombre: "Pedir una pausa",
    instruccion: "Avisa que necesitas un descanso corto y aléjate un momento del lugar.",
    emoji: "⏸️",
    familia: "cognitivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ECA,
    animacion: "calma",
  },
  {
    id: "que-viene-ahora",
    nombre: "¿Qué viene ahora?",
    instruccion: "Pregunta o revisa qué va a pasar después, para que no te tome por sorpresa.",
    emoji: "🗓️",
    familia: "cognitivo",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ECA,
    animacion: "calma",
  },

  // ---------- Familia E · Reductores de input sensorial ----------
  {
    id: "audifonos",
    nombre: "Audífonos / orejeras",
    instruccion: "Ponte los audífonos o tapa un poco los oídos para bajar el ruido.",
    emoji: "🎧",
    familia: "sensorial",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ["calle", "escuela"],
    animacion: "calma",
  },
  {
    id: "rincon-tranquilo",
    nombre: "Buscar un rincón tranquilo",
    instruccion: "Ve a un lugar con menos ruido, menos gente o menos luz por un rato.",
    emoji: "🚪",
    familia: "sensorial",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ECA,
    animacion: "calma",
  },
  {
    id: "objeto-regulacion",
    nombre: "Objeto de regulación",
    instruccion: "Usa tu objeto de textura o fidget para tener algo con qué calmarte.",
    emoji: "🧸",
    familia: "sensorial",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: TODOS,
    animacion: "calma",
  },
  {
    id: "bajar-luz",
    nombre: "Bajar la luz",
    instruccion: "Si puedes, aléjate de la luz fuerte o cúbrete un poco los ojos.",
    emoji: "🕶️",
    familia: "sensorial",
    intensidad: "suave",
    estado: "bajar",
    seguridad: "transversal",
    contextos: ["casa", "calle"],
    animacion: "calma",
  },
];

export function ejercicioPorId(id: string): Exercise | undefined {
  return EXERCISE_LIBRARY.find((e) => e.id === id);
}

/** Set por defecto: base segura transversal (Familia A + C), apta para cualquier perfil. */
export const DEFAULT_EXERCISE_IDS = [
  "empujar-pared",
  "apretar-manos",
  "respirar",
  "soplar-vela",
  "ponerle-nombre",
  "contar-lo-que-pasa",
];
