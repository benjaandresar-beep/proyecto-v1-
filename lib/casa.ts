// Mapa de la casa explorable (contexto Casa, Fase 2 ampliada).
// Una casa de un piso: habitación principal con tres puertas (patio al frente,
// pasillo derecho, pasillo izquierdo), y las áreas a las que llevan.
// Cada área usa todo el escenario; "arriba/izquierda/derecha" es la narrativa
// de navegación entre puertas, no la posición en pantalla.

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
    piso: "#d9b38c",
    entrada: [0, 3.2],
    puertas: [
      { id: "a-patio", ...fondo(0), destino: "patio", label: "Patio" },
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
    nombre: "Patio",
    piso: "#8bbf6a",
    entrada: [0, 3.4],
    puertas: [{ id: "volver", ...fondo(-4.6), destino: "principal", label: "Volver adentro" }],
  },

  "pasillo-der": {
    id: "pasillo-der",
    nombre: "Pasillo derecho",
    piso: "#cdb79a",
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
    piso: "#d6c3a2",
    entrada: [0, 3.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "pasillo-der", label: "Volver al pasillo" }],
  },

  "hab-der-abajo": {
    id: "hab-der-abajo",
    nombre: "Habitación 2",
    piso: "#d6c3a2",
    entrada: [0, 3.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "pasillo-der", label: "Volver al pasillo" }],
  },

  "pasillo-izq": {
    id: "pasillo-izq",
    nombre: "Pasillo izquierdo",
    piso: "#cdb79a",
    entrada: [0, 3.4],
    puertas: [
      { id: "volver", ...fondo(-4.6), destino: "principal", label: "Volver al living" },
      { id: "i-mi-pieza", ...fondo(3), destino: "tu-habitacion", label: "Mi pieza" },
    ],
  },

  "tu-habitacion": {
    id: "tu-habitacion",
    nombre: "Mi pieza",
    piso: "#c9b6d6",
    entrada: [0, 3.2],
    puertas: [{ id: "volver", ...fondo(0), destino: "pasillo-izq", label: "Volver al pasillo" }],
  },
};
