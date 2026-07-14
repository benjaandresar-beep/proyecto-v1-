// Repositorio ampliado de diálogos de los NPC por emoción y contexto.
// Cada emoción tiene varias frases; `elegirLinea` entrega una distinta a la
// anterior para que los niños no repitan el mismo diálogo dos veces seguidas.
// Textos provisionales: los valida el responsable clínico (sección 10).

import { EmotionId } from "./emotions";

export type LineasPool = Record<EmotionId, string[]>;

// ---------- Escuela: sala de clases y recreo ----------

export const LINEAS_ESCUELA: LineasPool = {
  enojo: [
    "¡Me rompieron mi dibujo! ¡Estoy muy enojado!",
    "¡Me quitaron el lápiz que estaba usando sin pedírmelo!",
    "¡En el partido del recreo hicieron trampa y no es justo!",
    "¡Guardé mi puesto y alguien se sentó igual!",
    "¡Llevo mucho rato esperando mi turno en el computador y no me lo dan!",
    "¡Rayaron mi cuaderno nuevo y nadie dice quién fue!",
  ],
  tristeza: [
    "Nadie quiso jugar conmigo en el recreo…",
    "Mi mejor amigo hoy no vino al colegio y lo echo de menos…",
    "Perdí el llavero que me regaló mi abuelita…",
    "No me eligieron para el equipo y me quedé mirando…",
    "Se terminó el proyecto que más me gustaba hacer en clases…",
    "Hoy nadie se sentó conmigo a la hora de almuerzo…",
  ],
  verguenza: [
    "Me equivoqué leyendo en voz alta y todos me miraron.",
    "Me caí frente a toda la fila y se escuchó fuerte.",
    "La profe me preguntó y se me olvidó la respuesta delante de todos.",
    "Canté más fuerte que todos justo cuando la música paró.",
    "Se me quedó la mochila abierta y se cayeron todas mis cosas.",
    "Me pusieron a bailar al frente y no me sabía los pasos.",
  ],
  miedo: [
    "La prueba de mañana me tiene muy nervioso…",
    "Mañana me toca disertar y me tiritan las manos…",
    "El timbre del colegio sonó tan fuerte que salté de la silla…",
    "Hay un perro grande en la reja y me da miedo pasar…",
    "No entendí la tarea y me da miedo preguntar…",
    "Me perdí camino a la biblioteca y no sabía dónde estaba…",
  ],
  alegria: [
    "¡Hoy traje mi juguete favorito! ¿Quieres verlo después?",
    "¡Me salió excelente el dibujo que hice en arte!",
    "¡La profe dijo que mañana hay salida al museo!",
    "¡Metí un gol en el recreo y todos me abrazaron!",
    "¡Hoy es mi cumpleaños y traje sorpresas para compartir!",
    "¡Aprendí a hacer un truco nuevo! ¿Te lo muestro?",
  ],
  calma: [
    "¿Nos sentamos un ratito juntos? Respiremos tranquilos.",
    "Estoy mirando cómo se mueven las hojas del árbol. ¿Miramos juntos?",
    "Después de correr, me gusta quedarme quietito y sentir mi corazón.",
    "¿Caminamos despacito por el patio, sin apuro?",
    "Cerré los ojos un momento y conté hasta cinco. Me sentí bien.",
    "Este rincón es tranquilo. Podemos quedarnos callados un ratito.",
  ],
};

// ---------- Casa: hermanos, ruidos del hogar, cambios de plan ----------

export const LINEAS_CASA: LineasPool = {
  enojo: [
    "¡Me cambiaron el canal justo en lo mejor!",
    "¡Mi hermano entró a mi pieza sin permiso otra vez!",
    "¡Ordené mis juguetes y alguien los desordenó todos!",
    "¡Me apagaron el juego justo cuando iba ganando!",
    "¡Me comieron el postre que estaba guardando para después!",
    "¡Siempre me toca a mí poner la mesa y a nadie más!",
  ],
  tristeza: [
    "Se canceló el paseo que esperaba toda la semana…",
    "Mi película favorita se terminó y no hay más capítulos…",
    "Mi primo se fue a vivir lejos y ya no viene a jugar…",
    "Se rompió el juguete que más quería…",
    "Papá llegó muy tarde y no alcanzamos a jugar…",
    "Llovió y no pudimos ir a la plaza como habíamos dicho…",
  ],
  verguenza: [
    "Boté el vaso de jugo en la mesa y todos miraron.",
    "Me escucharon cantando en la ducha a todo pulmón.",
    "Me quedé dormido en el sillón y me sacaron una foto.",
    "Se me cayó la comida en la ropa justo cuando había visitas.",
    "Dije una palabra mal y todos se rieron en el almuerzo.",
    "Mi mamá contó algo mío chistoso delante de las visitas.",
  ],
  miedo: [
    "Hay un ruido raro en la casa y no sé qué es…",
    "Se cortó la luz y quedó todo oscuro de repente…",
    "Los truenos de anoche sonaron muy fuerte…",
    "Soñé algo feo y todavía me acuerdo…",
    "La aspiradora suena tan fuerte que me tapo los oídos…",
    "Me da miedo bajar solo a buscar agua cuando está oscuro…",
  ],
  alegria: [
    "¡Vamos a hacer galletas! ¿Me ayudas a mezclar?",
    "¡Encontré mi juguete perdido debajo de la cama!",
    "¡Esta noche toca pijamada con película y cabritas!",
    "¡Me salió rico el pan con huevo que hice casi solo!",
    "¡Viene mi abuelita el fin de semana!",
    "¡Armamos una carpa con sábanas en el living!",
  ],
  calma: [
    "¿Miramos las nubes por la ventana un ratito?",
    "Me gusta este sillón calientito. ¿Nos sentamos con una mantita?",
    "Estoy dibujando tranquilo. ¿Quieres dibujar conmigo?",
    "El gato está ronroneando… escucharlo me da sueñito rico.",
    "¿Regamos las plantas despacito? Es mi momento favorito.",
    "Huele a pan tostado… respiremos hondo para sentirlo mejor.",
  ],
};

// ---------- Fiesta en el patio (asado): invitados ----------

export const LINEAS_FIESTA: LineasPool = {
  enojo: [
    "¡Me sacaron el último choripán justo cuando lo iba a comer!",
    "¡Me mojaron con el jugo jugando y no pidieron perdón!",
    "¡Estaba contando algo y me interrumpieron tres veces!",
    "¡Perdí en el juego porque cambiaron las reglas a mitad!",
    "¡Me guardé una silla y me la quitaron cuando fui al baño!",
    "¡La música está tan fuerte que nadie escucha lo que digo!",
  ],
  tristeza: [
    "Mi mejor amiga no pudo venir al asado…",
    "Ya se está yendo la gente y yo quería seguir jugando…",
    "Nadie probó la ensalada que ayudé a preparar…",
    "Me acordé de mi abuelito, que le encantaban los asados…",
    "Los grandes conversan y conversan y a mí nadie me pesca…",
    "Se desinfló la pelota justo cuando estábamos jugando…",
  ],
  verguenza: [
    "Se me cayó la bebida encima y todos me miraron.",
    "Me hicieron bailar delante de todos los tíos.",
    "Saludé con un abrazo a alguien que no conocía.",
    "Se me escapó un estornudo gigante y todos se dieron vuelta.",
    "Me preguntaron algo y me puse rojo sin saber qué decir.",
    "Me pillaron sacando un pedacito de torta antes de tiempo.",
  ],
  miedo: [
    "Hay mucha gente y mucho ruido… no conozco a todos.",
    "El fuego de la parrilla chisporrotea muy fuerte…",
    "Un abejorro anda dando vueltas cerca de la mesa…",
    "Se hizo de noche y el fondo del patio está muy oscuro…",
    "Reventaron un globo al lado mío y salté del susto…",
    "Hay un tío que habla tan fuerte que me asusta cuando se ríe…",
  ],
  alegria: [
    "¡El asado está quedando delicioso! ¿Quieres probar un pedacito?",
    "¡Llegaron mis primos! ¡Ahora sí que empieza la diversión!",
    "¡Hay torta de chocolate de postre, mi favorita!",
    "¡Ganamos el partido de pelota contra los grandes!",
    "¡Me dejaron ayudar a poner la música!",
    "¡Vamos a jugar a las escondidas por todo el patio!",
  ],
  calma: [
    "Sentémonos un ratito a mirar cómo sube el humito.",
    "Encontré un rincón con pasto fresquito, ¿nos tiramos a mirar el cielo?",
    "Me gusta escuchar las risas de lejos, sentaditos aquí.",
    "¿Tomamos jugo a la sombra mientras descansamos?",
    "Están saliendo las primeras estrellas… ¿las contamos?",
    "Aquí atrás se escucha todo más despacito. Se está bien.",
  ],
};

// ---------- Calle: estímulos urbanos, transeúntes ----------

export const LINEAS_CALLE: LineasPool = {
  enojo: [
    "¡Esa bicicleta casi me pasa por encima!",
    "¡Un auto pasó por la poza y me mojó entero!",
    "¡La fila del quiosco no avanza nunca!",
    "¡Alguien botó basura en la calle en vez del basurero!",
    "¡Me pisaron el pie y ni siquiera dijeron perdón!",
    "¡El semáforo cambió justo cuando iba a cruzar!",
  ],
  tristeza: [
    "Se me fue la micro y voy a llegar tarde…",
    "El quiosco estaba cerrado y yo venía caminando desde lejos…",
    "Vi un gatito solito en la calle y no pude llevarlo…",
    "Se me cayó el helado apenas le di una mordida…",
    "Cerraron la juguetería que me gustaba mirar…",
    "Mi globo se soltó y se fue volando alto, alto…",
  ],
  verguenza: [
    "Me tropecé en la esquina delante de todos.",
    "Saludé a alguien que creía conocer… y no era.",
    "Se me cayeron las monedas y rodaron por toda la vereda.",
    "Mi mamá me gritó desde lejos con mi apodo de guagua.",
    "Choqué con un poste por ir mirando para otro lado.",
    "Canté fuerte con mis audífonos sin darme cuenta de que me oían.",
  ],
  miedo: [
    "¡Cuánto ruido hay hoy en la calle!",
    "Pasó una ambulancia con la sirena a todo volumen…",
    "Hay demasiada gente y casi no puedo caminar…",
    "Un perro ladró muy fuerte detrás de la reja…",
    "Los autos pasan muy rápido y el cruce es largo…",
    "Están usando un taladro allá y suena en todo el cuerpo…",
  ],
  alegria: [
    "¡Mira, hay un perrito amistoso en la plaza!",
    "¡Un señor está haciendo burbujas gigantes en la esquina!",
    "¡Encontré una moneda de la suerte en la vereda!",
    "¡Hay un músico tocando canciones que conozco!",
    "¡Pintaron un mural nuevo con colores lindos!",
    "¡Ese quiosco tiene mis dulces favoritos!",
  ],
  calma: [
    "Caminemos despacito por la sombra, sin apuro.",
    "En esta banca se escuchan los pajaritos. ¿Nos sentamos?",
    "Me gusta mirar las vitrinas caminando lento.",
    "Esta cuadra tiene árboles grandes y se siente fresquito.",
    "¿Esperamos el verde respirando hondo, sin correr?",
    "Después del ruido, este pasaje tranquilo se siente rico.",
  ],
};

// ---------- Plaza: juegos, columpios, niños jugando ----------

export const LINEAS_PLAZA: LineasPool = {
  enojo: [
    "¡Me empujaron en la fila del resbalín!",
    "¡Llevo mucho rato esperando el columpio y no me lo dan!",
    "¡Patearon mi castillo de arena sin querer… pero igual me enojé!",
    "¡Dijeron que yo estaba fuera del juego y ni siquiera me tocaron!",
    "¡Se llevaron la pelota justo cuando me tocaba servir!",
    "¡Me gritaron 'apúrate' cuando recién estaba subiendo!",
  ],
  tristeza: [
    "Nadie me pasa la pelota cuando juego…",
    "Mis amigos se fueron a casa y me quedé solo en la plaza…",
    "Quería jugar a la pinta pero ya habían empezado sin mí…",
    "Se me rompió el volantín contra el árbol…",
    "El columpio que más me gusta está malo hace días…",
    "Encontré una pulsera perdida… alguien debe estar triste buscándola.",
  ],
  verguenza: [
    "Me caí del columpio y todos me miraron.",
    "Grité jugando a la pinta y ni me estaban persiguiendo.",
    "Me quedé atascado en el juego de trepar y me tuvieron que ayudar.",
    "Se me salió un zapato corriendo y quedó tirado en medio de todo.",
    "Bajé el resbalín gritando y estaba lleno de gente mirando.",
    "Le pegué a la pelota con todas mis fuerzas… y le pegué al aire.",
  ],
  miedo: [
    "El inflable es muy alto, me da susto saltar.",
    "El juego de trepar se mueve mucho cuando estoy arriba…",
    "Hay niños muy grandes jugando muy brusco cerca…",
    "Casi me caigo del pasamanos, mejor me bajé…",
    "El columpio va muy alto y me aprieta la guatita…",
    "Se está haciendo tarde y la plaza se ve distinta…",
  ],
  alegria: [
    "¡Vamos juntos al resbalín, va a ser genial!",
    "¡Me aprendí a columpiar solo, sin que me empujen!",
    "¡Encontramos una lagartija tomando sol en la piedra!",
    "¡Hagamos una carrera hasta el árbol grande!",
    "¡Crucé todo el pasamanos sin caerme, por primera vez!",
    "¡Trajeron burbujas! ¡Vamos a reventarlas todas!",
  ],
  calma: [
    "Descansemos un ratito en el pasto, ¿ya?",
    "Encontré un trébol. ¿Buscamos uno de cuatro hojas, despacito?",
    "Me gusta el sonido de las hojas cuando hay vientito.",
    "¿Nos columpiamos lento, lento, mirando el cielo?",
    "Hay hormiguitas trabajando en fila. ¿Las miramos sin molestarlas?",
    "A la sombra del árbol se está fresquito. Respiremos aquí.",
  ],
};

// ---------- Terapia: sala de espera y sesiones ----------

export const LINEAS_TERAPIA: LineasPool = {
  enojo: [
    "¡No quería dejar el juego que estaba armando!",
    "¡Quería el puzle de dinosaurios y otro niño lo tomó primero!",
    "¡Me tocó esperar mucho más que la vez pasada!",
    "¡Justo hoy no está el juego que más me gusta de la sala!",
    "¡Me sacaron de la casa cuando estaba entretenido jugando!",
    "¡Mi hermano tocó mis cosas mientras yo estaba en sesión!",
  ],
  tristeza: [
    "Echo de menos a mi mamá mientras espero…",
    "Mi terapeuta de antes ya no atiende aquí…",
    "Hoy no me resultaron los ejercicios y me fui bajoneado…",
    "Es mi última sesión y voy a echar de menos venir…",
    "Dibujé algo triste hoy porque así me sentía…",
    "Afuera está lloviendo y todo se ve gris por la ventana…",
  ],
  verguenza: [
    "Me da vergüenza cuando me toca hablar en la sesión.",
    "Lloré un poquito en la sesión y creo que se escuchó afuera.",
    "No sé si estoy haciendo bien los ejercicios…",
    "Me equivoqué en el nombre de la tía y le dije 'mamá'.",
    "Todos en la sala me miraron cuando entré…",
    "Me pillaron haciendo caras en el espejo de la sala.",
  ],
  miedo: [
    "Entrar a una sala nueva me pone nervioso.",
    "Hoy me atiende alguien que no conozco…",
    "No sé qué vamos a hacer hoy en la sesión…",
    "Ese instrumento hace un ruido que no me gusta…",
    "La puerta está cerrada y no sé cuándo me van a llamar…",
    "El pasillo es largo y no me acuerdo cuál era mi sala…",
  ],
  alegria: [
    "¡Hoy toca jugar con plasticina en T.O.!",
    "¡Me gané un sticker por completar todos los ejercicios!",
    "¡Hoy me salió algo que antes no me salía!",
    "¡La tía trajo un juego nuevo para la sesión!",
    "¡Terminando vamos a ir por un helado con mi mamá!",
    "¡Hoy me tocó la sala de las pelotas gigantes!",
  ],
  calma: [
    "Respiremos juntos un ratito mientras esperamos.",
    "Esta sala de espera tiene una pecera… mirar los peces me calma.",
    "Aprendí a respirar como un globo: se infla y se desinfla despacito.",
    "Me gusta este cojín blandito. ¿Te sientas al lado?",
    "Estoy escuchando la música suavecita de la sala.",
    "La tía me enseñó a apretar y soltar las manos. ¿Probamos?",
  ],
};

// ---------- selector sin repetición inmediata ----------

// última frase mostrada por (grupo, emoción), para no repetirla enseguida
const ultimaLinea = new Map<string, number>();

/**
 * Devuelve una frase del pool para la emoción dada, distinta de la última
 * mostrada en ese grupo (p. ej. "escuela:enojo"). Elegirla al abrir el
 * diálogo y guardarla en el estado, para que no cambie mientras está visible.
 */
export function elegirLinea(pool: LineasPool, emocion: EmotionId, grupo: string): string {
  const lineas = pool[emocion];
  const clave = `${grupo}:${emocion}`;
  const anterior = ultimaLinea.get(clave);
  let indice = Math.floor(Math.random() * lineas.length);
  if (lineas.length > 1 && indice === anterior) {
    // saltar 1..len-1 posiciones desde la anterior: nunca cae en la misma
    indice = (anterior + 1 + Math.floor(Math.random() * (lineas.length - 1))) % lineas.length;
  }
  ultimaLinea.set(clave, indice);
  return lineas[indice];
}
