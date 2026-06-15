// Mapa del colegio explorable (contexto Escuela ampliado).
// Dos áreas: la sala de clases (regulación: compañeros + profe) y el patio
// grande con cancha, baños, ping pong, palmeras y cancha de vóleibol.

export type EscuelaArea = "sala" | "patio";

export interface PuertaDef {
  id: string;
  pos: [number, number];
  aprox: [number, number];
  rotY: number;
  destino: EscuelaArea;
  label: string;
}

export interface AreaDef {
  id: EscuelaArea;
  nombre: string;
  piso: string;
  entrada: [number, number];
  /** medio ancho que la cámara debe encuadrar (el patio es más amplio) */
  frame: number;
  /** límites del área caminable [xMax, zMin, zMax] */
  limites: [number, number, number];
  puertas: PuertaDef[];
}

export const ESCUELA_AREAS: Record<EscuelaArea, AreaDef> = {
  sala: {
    id: "sala",
    nombre: "Sala de clases",
    piso: "#dcc89f",
    entrada: [0, 3.2],
    frame: 7.4,
    limites: [6, -3, 4.2],
    puertas: [
      {
        id: "a-patio",
        pos: [5.4, -4.8],
        aprox: [5.4, -3.1],
        rotY: 0,
        destino: "patio",
        label: "Salir al patio",
      },
    ],
  },
  patio: {
    id: "patio",
    nombre: "Patio del colegio",
    piso: "#9ccb6a",
    entrada: [0, -2.8],
    frame: 11,
    limites: [9.5, -4.4, 4.4],
    puertas: [
      {
        id: "volver",
        pos: [0, -5.6],
        aprox: [0, -4],
        rotY: 0,
        destino: "sala",
        label: "Volver a la sala",
      },
    ],
  },
};
