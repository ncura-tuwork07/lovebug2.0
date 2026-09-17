import { ZODIAC_KEYS, type ZodiacKey } from "@/lib/zodiac";

// Banco curado por signo: se usa cuando no hay Claude para adaptar el horóscopo online.
// Tono: cálido, práctico, con guiños a la vida en familia. Nunca fatalista.
export const HOROSCOPE: Record<ZodiacKey, string[]> = {
  aries: [
    "Tu energía de hoy rinde más si la enfocás en una sola cosa a la vez, no en diez.",
    "Buen día para resolver eso que venís posponiendo. Tu impulso natural te va a ayudar.",
    "Cuidado con la impaciencia con la familia hoy: contá hasta tres antes de responder.",
    "Tu liderazgo hoy se nota en los detalles chicos, no solo en las decisiones grandes.",
    "Es un buen momento para proponer un plan nuevo en pareja; tu iniciativa va a ser bien recibida.",
    "Canalizá el ímpetu del día en el ejercicio o una tarea física pendiente de la casa.",
    "Hoy te conviene escuchar un poco más antes de actuar; la prisa puede jugarte en contra.",
    "Tu determinación es justo lo que necesita hoy algún proyecto familiar trabado.",
  ],
  tauro: [
    "Hoy rendís con calma y constancia: una tarea terminada vale más que tres empezadas.",
    "Buen día para ordenar las cuentas de la casa; tu ojo para lo concreto te ayuda.",
    "Un mimo simple (una comida rica, un rato tranquilo) hoy vale más que un plan grande.",
    "No te aferres a cómo se hacía siempre: alguien en casa puede tener una idea mejor.",
    "Tu paciencia hoy sostiene a los demás. Reservate también un rato para vos.",
    "Es un buen momento para avanzar con una meta de ahorro; la disciplina hoy sale fácil.",
    "Cuidado con la terquedad en una discusión chica: ceder no te quita nada.",
    "Hoy disfrutá lo que ya tenés en casa antes de pensar en lo que falta.",
  ],
  geminis: [
    "Tu cabeza va rápido hoy: anotá las ideas antes de que se te escapen.",
    "Buen día para una charla pendiente con tu pareja; las palabras te salen claras.",
    "Ojo con empezar muchas cosas a la vez; elegí dos y terminalas.",
    "Tu humor hoy le hace bien a la casa. Usalo para destrabar un momento tenso.",
    "Un mensaje a alguien que hace tiempo no ves puede alegrarte el día.",
    "Es un buen momento para explicarle algo a los chicos con paciencia; hoy encontrás la forma.",
    "Hoy conviene escuchar hasta el final antes de responder; no todo necesita una réplica.",
    "Tu curiosidad hoy puede resolver un problema doméstico de forma inesperada.",
  ],
  cancer: [
    "Hoy tu sensibilidad es una brújula: prestale atención a cómo están los tuyos.",
    "Buen día para cuidar la casa como nido: un orden chico cambia el clima.",
    "No te lleves todo al corazón; algún comentario de hoy no venía con mala intención.",
    "Tu memoria afectiva hoy suma: una tradición familiar puede volver a tener lugar.",
    "Es un buen momento para planear una comida en familia; te sale natural.",
    "Cuidado con cargar con todo solo; pedí ayuda con las tareas de la casa.",
    "Hoy un gesto de cariño tuyo puede ser justo lo que alguien de casa necesitaba.",
    "Tu intuición hoy está fina para decisiones sobre los chicos. Confiá en ella.",
  ],
  leo: [
    "Tu calidez hoy ilumina la casa; usala para animar a quien esté bajón.",
    "Buen día para organizar algo divertido para la familia; tu entusiasmo contagia.",
    "Cuidado con querer tener siempre la última palabra; hoy escuchá más.",
    "Tu generosidad hoy se nota en el tiempo que das, no en lo que gastás.",
    "Es un buen momento para reconocer el esfuerzo de tu pareja en voz alta.",
    "Hoy liderá con el ejemplo: la tarea que menos te gusta, hacela primero.",
    "Una alegría chica en casa hoy merece celebrarse. No la dejes pasar.",
    "Tu confianza hoy ayuda a destrabar una decisión familiar que venía dando vueltas.",
  ],
  virgo: [
    "Tu ojo para el detalle hoy resuelve algo que a los demás se les pasó.",
    "Buen día para armar la lista de la semana; te va a ordenar la cabeza.",
    "No busques que todo salga perfecto; con que salga, hoy alcanza.",
    "Tu forma de cuidar es servir; hoy dejate cuidar un poco también.",
    "Es un buen momento para revisar vencimientos y papeles; hoy tenés paciencia para eso.",
    "Cuidado con la crítica a los chicos hoy; mejor mostrales cómo, sin señalar.",
    "Hoy una rutina simple te da más calma que cualquier plan nuevo.",
    "Tu practicidad hoy le pone los pies en la tierra a un proyecto de la casa.",
  ],
  libra: [
    "Hoy tu don es equilibrar: sos quien puede calmar una discusión en casa.",
    "Buen día para embellecer un rincón de la casa; lo lindo te hace bien.",
    "No te quedes en la duda por no incomodar; decí lo que pensás con cariño.",
    "Tu sentido de justicia hoy ayuda a repartir mejor las tareas de la casa.",
    "Es un buen momento para un plan de a dos; el tiempo en pareja hoy rinde.",
    "Cuidado con postergar una decisión por querer conformar a todos.",
    "Hoy una charla amable resuelve más que cualquier planilla.",
    "Tu diplomacia hoy le sirve a la familia extendida: sos el puente.",
  ],
  escorpio: [
    "Tu intensidad hoy es un motor: usala para terminar algo importante.",
    "Buen día para una conversación honesta que venías evitando.",
    "No te guardes lo que sentís hasta que explote; decilo temprano y suave.",
    "Tu lealtad hoy es un ancla para tu pareja. Hacésela saber.",
    "Es un buen momento para tomar una decisión financiera con cabeza fría.",
    "Cuidado con leer intenciones ocultas donde solo hay cansancio.",
    "Hoy tu capacidad de foco resuelve un trámite o gestión pendiente.",
    "Un cambio en casa que te daba miedo hoy puede verse como una oportunidad.",
  ],
  sagitario: [
    "Tu optimismo hoy contagia; usalo para arrancar el día con buena onda.",
    "Buen día para planear una salida o un viaje corto en familia.",
    "Cuidado con prometer más de lo que el día permite; menos y cumplido.",
    "Tu franqueza hoy suma si viene con cariño; medí el tono.",
    "Es un buen momento para enseñarles algo nuevo a los chicos; hoy tenés paciencia.",
    "Hoy una caminata o un rato al aire libre te despeja la cabeza.",
    "No dejes que la rutina te aplaste: sumale un toque distinto a la cena.",
    "Tu visión de largo plazo hoy le hace bien a las metas familiares.",
  ],
  capricornio: [
    "Tu disciplina hoy avanza una meta familiar más de lo que parece.",
    "Buen día para ordenar prioridades: qué es urgente y qué puede esperar.",
    "No cargues con todo en silencio; en casa también quieren ayudarte.",
    "Tu sentido de responsabilidad hoy es un ejemplo para los chicos.",
    "Es un buen momento para revisar el presupuesto del mes con calma.",
    "Cuidado con ser demasiado exigente con vos hoy; ya hacés mucho.",
    "Hoy un logro chico merece un festejo; no todo es cumplir.",
    "Tu constancia hoy le da forma a un proyecto de la casa que venía en pausa.",
  ],
  acuario: [
    "Tu creatividad hoy puede resolver algo de forma distinta a como lo venían haciendo.",
    "Buen día para conectar con amigos o familia que hace tiempo no ves.",
    "Tu independencia es una virtud, pero hoy el equipo rinde más si sumás a los demás al plan.",
    "Una idea que parecía poco convencional hoy puede ser justo la solución que faltaba.",
    "Tu sensibilidad hoy te ayuda a notar algo que a otros se les pasó por alto en casa.",
    "Es un buen momento para organizar algo original para los chicos, se van a sorprender.",
    "Hoy rendís mejor si te das un rato a solas antes de encarar la lista de tareas.",
    "Tu visión de largo plazo hoy le hace bien a las metas familiares que vienen posponiendo.",
  ],
  piscis: [
    "Tu empatía hoy percibe lo que nadie dijo en casa. Preguntá con cariño.",
    "Buen día para un rato de música, arte o juego con los chicos; te recarga.",
    "No te disuelvas en las necesidades de todos; poné un límite amable.",
    "Tu imaginación hoy puede transformar una tarde aburrida en un plan lindo.",
    "Es un buen momento para escribir o rezar por lo que te preocupa; te ordena.",
    "Cuidado con postergar lo práctico; una cosa concreta resuelta hoy te alivia.",
    "Hoy una charla tranquila con tu pareja te devuelve la calma.",
    "Tu fe hoy sostiene a la familia más de lo que creés.",
  ],
};

export function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Horóscopo curado de todos los signos para un día dado.
export function fallbackHoroscopes(date: Date): Record<ZodiacKey, string> {
  const day = dayOfYear(date);
  return Object.fromEntries(ZODIAC_KEYS.map((k) => [k, HOROSCOPE[k][day % HOROSCOPE[k].length]])) as Record<ZodiacKey, string>;
}
