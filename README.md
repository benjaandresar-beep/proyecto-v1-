# Mi Calma · Juego de regulación emocional (contexto Escuela)

Prototipo del **juego de regulación emocional** descrito en la *Especificación de Desarrollo v2*
(plataforma clínica TEA · TDAH · AuDHD). Implementa el contexto **Escuela (MVP)** con la mecánica
central completa y las salvaguardas clínicas obligatorias.

> El prototipo cubre el **juego completo** (tres contextos) y un **lado profesional mínimo**
> (`/pro`, sección 6 de la spec): casos por código, ficha → perfil, set de reguladores por caso,
> clave que abre solo el juego, y guía para el hogar generada por plantillas con **revisión
> editable obligatoria por bloques** (sin «aprobar todo», salvaguarda 5.5). Al no haber servidor
> (despliegue estático), la cuenta y los casos viven en localStorage del dispositivo del
> profesional; la autenticación es declarativa y de prototipo.

## Cómo correr

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
```

## Pantallas

| Ruta | Qué es |
| --- | --- |
| `/` | Inicio: avatar 3D, entrada a los tres contextos y logros del puente a la vida real |
| `/avatar` | Editor del personaje (piel, pelo, polera) con vista previa 3D |
| `/escuela` | Contexto Escuela **explorable**: sala de clases (compañeros + profe) con puerta que se abre a un patio amplio (cancha, baños, mesas de ping pong, palmeras, cancha de vóleibol) |
| `/casa` | Contexto Casa **explorable**: casa de un piso con living, patio (perro, gato, alimentar), pasillos y habitaciones conectados por puertas que se abren |
| `/calle` | Contexto Calle (4.3): transeúntes que cambian de lugar, autos cruzando, bocinazos más frecuentes, papá que acompaña y audífonos que reducen el estímulo |
| `/escuela-2d` | La misma mecánica en la escena 2D original, conservada para comparar en validaciones |
| `/clinico` | Config rápida del dispositivo: set de reguladores (5.4) y ritmo de eventos |
| `/pro` | Lado profesional: registro/login declarativo, casos por código (6.1), ficha → perfil (6.2), guía con revisión por bloques (6.3), clave del juego (6.4) |

Cada contexto entra siempre por su bloque de asentimiento (5.1) y comparte la mecánica central y
las salvaguardas; cambian los NPC, la figura de apoyo, las líneas de diálogo, el estímulo
ambiental y el entorno 3D (definidos en `lib/contexts.ts`).

## Mecánica implementada (referencias a la spec)

- **3.1 Carga emocional cualitativa**: sin números visibles; la guatita del avatar se llena con los
  colores de las emociones acumuladas.
- **3.2 Burbujas emocionales**: 7 burbujas iniciales repartidas entre 8 compañeros, con código
  cromático (rojo enojo, azul tristeza, rosa vergüenza, morado miedo, amarillo alegría, verde
  calma). Si el niño no interactúa en el intervalo configurado, las burbujas **migran** a otros NPC.
- **3.3 Interocepción (conservada tal cual)**: al escuchar a un compañero con emoción
  displacentera, el color **viaja a la zona del estómago** y se acumula ahí.
- **3.4 Reguladores**: los ejercicios bajan la carga de forma **parcial**; conversar con la profe
  ofrece "¿en qué te puedo ayudar hoy?" con **respuestas coloreadas dinámicas** según lo acumulado,
  transición de nubes, y baja **fuerte pero nunca a cero** (salvaguarda 5.3).
- **3.5 Puente juego → vida real**: tras cada ejercicio, "¿Lo hiciste de verdad?" (sí / aún no).
  Los "sí" se celebran y se cuentan en el inicio.
- **3.6 Crisis**: si la carga se llena, **pausa guiada de calma** (pantalla se nubla, respiración
  acompañada, mensaje sin culpa) y se retoma con carga media. No es castigo ni game over.
- **4.1 Escuela**: evento periódico de **ruido fuerte** (~1 s de animación, sube un poco la carga).
- **5.1 Asentimiento**: bloque previo a cada entrada al contexto.
- **5.2 Mezcla social**: hay NPC neutros y reguladores (un amigo que calma); no toda interacción
  social sube la carga.
- **5.4 Set configurable**: el repertorio activo de ejercicios se define en `/clinico` o por caso
  en `/pro`, desde la **biblioteca clínica de ejercicios** (documento "Biblioteca de ejercicios de
  regulación v1").

### Biblioteca de ejercicios (`lib/exercises.ts`)

23 técnicas organizadas **por mecanismo, no por diagnóstico** (decisión estructural del documento
clínico), en cinco familias:

- **A · Propioceptivos / trabajo pesado** — empujar la pared, apretar manos, abrazo de oso, llevar
  algo pesado, empujar o tirar, tensar y soltar. Base segura transversal.
- **B · Vestibulares / movimiento** — saltar, correr en el sitio (alertantes, *precaución*),
  balanceo lento, marcha rítmica (calmantes).
- **C · Respiratorios e interoceptivos** — respiración del globo, cuadrada, soplar la vela,
  «¿dónde lo siento?».
- **D · Cognitivo-psicológicos** — ponerle nombre, contar lo que pasa, frase de calma, pedir una
  pausa, «¿qué viene ahora?».
- **E · Reductores de input sensorial** — audífonos, rincón tranquilo, objeto de regulación, bajar
  la luz.

Cada ejercicio lleva su **familia**, el **estado que regula** (↓ hiperactivación / ↑ hipoactivación),
su **seguridad** (transversal / precaución) y los **contextos** donde aplica. El juego solo ofrece
las herramientas del set que correspondan al contexto actual (mapa de la sección 7 del documento);
los ejercicios alertantes dan menos alivio y avisan si la carga ya está alta (regla de seguridad B).
El configurador de `/pro` sugiere el set siguiendo el árbol de decisión por perfil sensorial
(sección 8). Cada técnica tiene su animación 3D del personaje (incluidas abrazo, balanceo y marcha).

## Frontera de datos (sección 2 y 7)

El juego **no contiene ni pide datos clínicos**: sin diagnóstico, sin nombre real, sin servidor.
Todo el estado (avatar, configuración, progreso) vive en `localStorage` del dispositivo.

## Qué es provisional

- **Arte**: personajes y sala low-poly generados en código (Three.js) y SVG plano en la versión
  2D, pensados para ser reemplazados por el arte final.
- **Textos** (diálogos de NPC, asentimiento, mensajes): borradores que debe validar/reescribir el
  responsable clínico (reparto de responsabilidades, sección 10).
- **Pesos internos** (cuánto sube/baja cada interacción): constantes en
  `components/SchoolGame.tsx`, a calibrar con el responsable clínico.

## Stack

Next.js 15 (App Router) + React 19 + TypeScript. La escena principal es 3D low-poly con Three.js
(react-three-fiber + drei), por decisión del cliente posterior a la spec (la sección 9 de la spec
excluía el 3D para acotar costo; se conserva la versión 2D en `/escuela-2d`). Los diálogos, el HUD
y las salvaguardas son DOM/CSS compartidos entre ambas versiones.
