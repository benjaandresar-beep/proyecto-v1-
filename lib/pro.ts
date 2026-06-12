// Lado profesional (sección 6 de la spec) — prototipo sin servidor:
// la cuenta y los casos viven en localStorage del dispositivo del profesional.
// Seudonimización (sección 7): los casos se identifican por código, nunca por
// nombre real. El vínculo código–persona lo mantiene el profesional fuera del sistema.

export interface CuentaPro {
  nombre: string;
  profesion: string;
  email: string;
  /** N° de registro de prestador de salud — declarativo en el prototipo (decisión #8) */
  registro: string;
  claveHash: string;
}

export type EstadoBloque = "pendiente" | "confirmado" | "descartado";

export interface BloqueGuia {
  id: string;
  titulo: string;
  texto: string;
  estado: EstadoBloque;
}

export type PerfilSensorial = "buscador" | "evitador" | "mixto";

export interface Caso {
  id: string;
  /** identificación por código, no por nombre real (sección 7) */
  codigo: string;
  diagnosticos: string[]; // etiquetas que precargan sugerencias, no que suman (6.2)
  perfilSensorial: PerfilSensorial;
  rasgos: string[]; // ids del catálogo predefinido (6.2)
  fortalezas: string; // texto libre
  formaActual: string; // texto libre
  observaciones: string; // texto libre
  /** set de reguladores del caso (salvaguarda 5.4) */
  ejercicios: string[];
  /** clave que abre SOLO el juego (6.4); revocable */
  clave: string | null;
  archivado: boolean;
  guia: { bloques: BloqueGuia[]; generadaEl: string | null } | null;
  creadoEl: string;
}

const KEYS = {
  cuenta: "regula:pro:cuenta",
  sesion: "regula:pro:sesion",
  casos: "regula:pro:casos",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const proStorage = {
  getCuenta: () => read<CuentaPro | null>(KEYS.cuenta, null),
  setCuenta: (c: CuentaPro) => write(KEYS.cuenta, c),
  getSesion: () => read<boolean>(KEYS.sesion, false),
  setSesion: (s: boolean) => write(KEYS.sesion, s),
  getCasos: () => read<Caso[]>(KEYS.casos, []),
  setCasos: (c: Caso[]) => write(KEYS.casos, c),
};

/** Hash simple no criptográfico: el prototipo no guarda la contraseña en claro,
 *  pero NO es seguridad real. El producto final usa autenticación de servidor. */
export function hashSimple(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

const SIN_AMBIGUAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Clave de acceso al juego (6.4): legible para dictar por teléfono. */
export function generarClave(): string {
  const parte = (n: number) =>
    Array.from({ length: n }, () => SIN_AMBIGUAS[Math.floor(Math.random() * SIN_AMBIGUAS.length)]).join("");
  return `CALMA-${parte(4)}-${parte(4)}`;
}

export function generarCodigoCaso(existentes: Caso[]): string {
  let n = existentes.length + 1;
  const usados = new Set(existentes.map((c) => c.codigo));
  let codigo = `NNA-${String(n).padStart(3, "0")}`;
  while (usados.has(codigo)) {
    n += 1;
    codigo = `NNA-${String(n).padStart(3, "0")}`;
  }
  return codigo;
}

export function nuevoCaso(existentes: Caso[]): Caso {
  return {
    id: `caso-${Date.now()}`,
    codigo: generarCodigoCaso(existentes),
    diagnosticos: [],
    perfilSensorial: "mixto",
    rasgos: [],
    fortalezas: "",
    formaActual: "",
    observaciones: "",
    ejercicios: [],
    clave: null,
    archivado: false,
    guia: null,
    creadoEl: new Date().toISOString(),
  };
}
