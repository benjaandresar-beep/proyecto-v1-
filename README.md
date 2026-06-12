# Mi Calma · Juego de regulación emocional (contexto Escuela)

Prototipo del **juego de regulación emocional** descrito en la *Especificación de Desarrollo v2*
(plataforma clínica TEA · TDAH · AuDHD). Implementa el contexto **Escuela (MVP)** con la mecánica
central completa y las salvaguardas clínicas obligatorias.

> Alcance acordado: **solo el juego** (sin lado profesional). La ficha clínica, la guía para el
> hogar y la clave de acceso quedan para fases posteriores. El "modo clínico" incluido es una
> pantalla mínima que simula la configuración por caso que en el producto completo hará el
> profesional desde su cuenta.

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
| `/escuela` | Contexto Escuela (4.1): compañeros, profe, ruido fuerte periódico |
| `/casa` | Contexto Casa (4.2): hermanos y familia, cuidadora, ruido doméstico |
| `/calle` | Contexto Calle (4.3): transeúntes que cambian de lugar, autos cruzando, bocinazos más frecuentes, papá que acompaña y audífonos que reducen el estímulo |
| `/escuela-2d` | La misma mecánica en la escena 2D original, conservada para comparar en validaciones |
| `/clinico` | Modo clínico: set de reguladores por caso (5.4) y ritmo de eventos |

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
- **5.4 Set configurable**: el repertorio activo de ejercicios se define en `/clinico`, con
  etiquetas de intensidad (intenso = perfil buscador, suave = perfil hipersensible).

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
