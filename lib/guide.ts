// Generador del borrador de la guía para el hogar (6.3) por PLANTILLAS CON REGLAS
// (decisión #7: sin IA generativa; sin datos saliendo del dispositivo).
// El sistema solo propone el borrador: el profesional revisa, ajusta o descarta
// cada bloque antes de generar la guía final (salvaguarda 5.5). Los textos de
// las plantillas los valida el responsable clínico (sección 10).

import { BloqueGuia, Caso, PerfilSensorial } from "./pro";

// ---------- catálogo predefinido de rasgos (6.2) ----------

export interface Rasgo {
  id: string;
  etiqueta: string;
  /** señal temprana observable en el cuerpo/conducta */
  senal: string;
  /** recomendaciones que aporta por contexto */
  recs: Partial<Record<"escuela" | "casa" | "calle", string>>;
}

export const RASGOS: Rasgo[] = [
  {
    id: "ruidos",
    etiqueta: "Se sobrecarga con ruidos fuertes",
    senal: "Se tapa los oídos, se encoge o se queda muy quieto cuando hay ruido.",
    recs: {
      escuela: "Acordar con la escuela un aviso previo cuando habrá ruidos esperables (campana, actos, educación física) y un lugar tranquilo al que pueda ir si se sobrecarga.",
      calle: "Llevar audífonos o protectores auditivos en salidas; ofrecérselos ANTES de los lugares ruidosos, no después de la sobrecarga.",
    },
  },
  {
    id: "cambios",
    etiqueta: "Le cuestan los cambios de plan",
    senal: "Se irrita o se angustia cuando algo cambia de improviso, aunque parezca pequeño.",
    recs: {
      casa: "Anticipar los cambios de plan apenas se sepan, con palabras simples y, si ayuda, con apoyo visual (calendario, dibujos). Evitar el «sorpresa: ya no vamos».",
    },
  },
  {
    id: "movimiento",
    etiqueta: "Busca movimiento e input fuerte",
    senal: "Salta, corre, choca o empuja más de lo habitual cuando se está cargando.",
    recs: {
      casa: "Ofrecer «recreos de cuerpo» en la rutina: saltar, empujar la pared, cargar cosas pesadas con supervisión. No son desorden: son regulación.",
      escuela: "Pedir a la escuela permisos de movimiento breves (repartir cuadernos, borrar la pizarra) antes de que la carga suba.",
    },
  },
  {
    id: "aislarse",
    etiqueta: "Se aleja de los demás cuando está cargado",
    senal: "Busca rincones, se esconde o deja de responder cuando el cuerpo se le llenó.",
    recs: {
      casa: "Respetar su distancia como primera ayuda: acordar un «rincón de calma» y dejar claro que ir ahí no es castigo.",
    },
  },
  {
    id: "perder",
    etiqueta: "Le cuesta perder o equivocarse",
    senal: "Los juegos con competencia o los errores chicos disparan rabia o llanto intensos.",
    recs: {
      casa: "Antes de juegos con competencia, recordar en frío qué puede hacer si pierde. Los adultos pueden modelar el error en voz alta («me equivoqué, respiro y sigo»).",
    },
  },
  {
    id: "pedirayuda",
    etiqueta: "Le cuesta pedir ayuda",
    senal: "Aguanta la carga en silencio hasta que explota, en vez de avisar antes.",
    recs: {
      escuela: "Acordar con la profesora una seña discreta (una tarjeta, un gesto) que signifique «necesito ayuda», para no obligarlo a decirlo en voz alta frente al curso.",
    },
  },
  {
    id: "texturas",
    etiqueta: "Le incomodan texturas o comidas nuevas",
    senal: "Rechaza ropa, comidas o contactos específicos con una intensidad que no es capricho.",
    recs: {
      casa: "Introducir comidas o texturas nuevas sin presión y en pasos chicos (mirar, tocar, probar otro día). Forzar suele subir la carga, no bajar el rechazo.",
    },
  },
  {
    id: "transiciones",
    etiqueta: "Le cuesta pasar de una actividad a otra",
    senal: "Cortar algo que le gusta (pantalla, juego) genera peleas desproporcionadas.",
    recs: {
      escuela: "Pedir avisos de tiempo antes de los cambios de actividad («en 5 minutos guardamos»).",
      casa: "Usar avisos de tiempo y, si ayuda, un temporizador visible. El aviso es el puente entre lo que hace y lo que viene.",
    },
  },
];

// ---------- plantillas ----------

const TEXTO_DIAGNOSTICO: Record<string, string> = {
  TEA: "En el espectro autista, gran parte de la desregulación nace de la sobrecarga sensorial y de los cambios imprevistos: el entorno entrega más estímulo del que el cuerpo puede procesar, y la carga se acumula.",
  TDAH: "En el TDAH, el cuerpo suele necesitar más movimiento y más novedad para regularse, y la frustración sube rápido cuando hay que esperar, perder o sostener tareas largas.",
  AuDHD: "Cuando TEA y TDAH coexisten (AuDHD), conviven dos fuerzas: un cuerpo que busca movimiento y novedad, y un sistema sensorial que se sobrecarga con facilidad. Por eso algunas estrategias sirven un día y no al siguiente: la clave es observar qué necesita su cuerpo en cada momento.",
};

const TEXTO_SENSORIAL: Record<PerfilSensorial, string> = {
  buscador: "Su perfil sensorial es buscador: el movimiento y el input fuerte (saltar, empujar, correr) le ayudan a ordenar el cuerpo. Las estrategias de esta guía privilegian darle ese input a tiempo, antes de que la carga se desborde.",
  evitador: "Su perfil sensorial es evitador: los estímulos intensos (ruido, luces, multitudes) lo sobrecargan. Las estrategias de esta guía privilegian bajar el estímulo, anticipar y ofrecer pausas de baja estimulación.",
  mixto: "Su perfil sensorial es mixto: a ratos busca movimiento fuerte y a ratos necesita silencio y pausa. Ninguna estrategia sirve siempre; la pregunta útil es «¿qué está pidiendo su cuerpo ahora: descarga o refugio?».",
};

const RECS_BASE: Record<"escuela" | "casa" | "calle", string[]> = {
  escuela: [
    "Mirar la guatita antes que la conducta: cuando aparezcan las señales tempranas, ofrecer una herramienta de calma ANTES de exigir que se porte bien.",
  ],
  casa: [
    "Mantener rutinas predecibles en lo posible; la previsibilidad baja la carga de base con la que enfrenta el resto del día.",
  ],
  calle: [
    "Planificar las salidas en horarios de menos estímulo cuando se pueda, y acortarlas sin culpa si el cuerpo ya no da más: retirarse a tiempo es una victoria, no una derrota.",
    "Ir de la mano o cerca de un adulto conocido es en sí mismo un regulador: el acompañamiento baja la carga.",
  ],
};

function parrafoBullets(lineas: string[]): string {
  return lineas.map((l) => `• ${l}`).join("\n");
}

/** Genera el BORRADOR de la guía desde el perfil del caso (6.3, paso 1). */
export function generarBloques(caso: Caso): BloqueGuia[] {
  const rasgos = RASGOS.filter((r) => caso.rasgos.includes(r.id));

  const intro: string[] = [];
  intro.push(
    "Las emociones se sienten en el cuerpo y se van acumulando, como un vaso que se llena. Cuando el vaso se llena del todo, aparece la crisis: no es maña ni manipulación, es un cuerpo que ya no pudo más."
  );
  for (const d of caso.diagnosticos) {
    if (TEXTO_DIAGNOSTICO[d]) intro.push(TEXTO_DIAGNOSTICO[d]);
  }
  intro.push(TEXTO_SENSORIAL[caso.perfilSensorial]);
  if (caso.formaActual.trim()) {
    intro.push(`Momento actual: ${caso.formaActual.trim()}`);
  }

  const senales =
    rasgos.length > 0
      ? parrafoBullets(rasgos.map((r) => r.senal))
      : "• Observar en qué momentos del día y ante qué situaciones aparece la desregulación, y anotarlo: ese registro es la mejor señal temprana.";

  const recsDe = (ctx: "escuela" | "casa" | "calle") =>
    parrafoBullets([
      ...RECS_BASE[ctx],
      ...rasgos.flatMap((r) => (r.recs[ctx] ? [r.recs[ctx]!] : [])),
    ]);

  const bloques: BloqueGuia[] = [
    {
      id: "intro",
      titulo: "Por qué se desregula",
      texto: intro.join("\n\n"),
      estado: "pendiente",
    },
    {
      id: "senales",
      titulo: "Señales tempranas para mirar",
      texto: senales,
      estado: "pendiente",
    },
    { id: "escuela", titulo: "En la escuela", texto: recsDe("escuela"), estado: "pendiente" },
    { id: "casa", titulo: "En la casa", texto: recsDe("casa"), estado: "pendiente" },
    { id: "calle", titulo: "En la calle", texto: recsDe("calle"), estado: "pendiente" },
    {
      id: "ayuda",
      titulo: "Pedir ayuda es parte de la solución (no la solución entera)",
      texto:
        "Cuando recurre a un adulto, la carga baja mucho, pero no a cero: eso es intencional y está bien. La autorregulación se aprende combinando dos cosas: pedir ayuda Y hacer su propia parte (respirar, saltar, empujar la pared, según su set de herramientas).\n\nCuando practique una herramienta en el juego, pregúntenle si la hizo de verdad. Cada vez que la practica en el mundo real, la herramienta se vuelve más disponible para el momento difícil.",
      estado: "pendiente",
    },
  ];

  if (caso.fortalezas.trim()) {
    bloques.splice(1, 0, {
      id: "fortalezas",
      titulo: "Sus fortalezas e intereses",
      texto: `${caso.fortalezas.trim()}\n\nLas fortalezas e intereses no son un adorno: son la puerta de entrada para conectar, motivar y recuperar la calma.`,
      estado: "pendiente",
    });
  }

  return bloques;
}
