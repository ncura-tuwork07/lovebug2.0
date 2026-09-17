// Contenido "del día" para la sección de Inspiración de Hoy.
// Se elige de forma determinística según el día del año, así cambia todos
// los días sin necesitar backend ni una API externa.

import { dayOfYear, fallbackHoroscopes } from "@/lib/content/horoscope";

export type VerseOfDay = {
  reference: string;
  verse: string;
  reflection: string;
};

export type PrayerOfDay = {
  title: string;
  text: string;
};

export const VERSES: VerseOfDay[] = [
  {
    reference: "1 Corintios 13, 4-7",
    verse: "El amor es paciente, es servicial; el amor no es envidioso, no hace alarde, no se envanece.",
    reflection: "Hoy es un buen día para elegir la paciencia con los que más amamos, aunque el día venga cargado.",
  },
  {
    reference: "Josué 1, 9",
    verse: "Sé fuerte y valiente. No temas ni desmayes, porque el Señor tu Dios estará contigo dondequiera que vayas.",
    reflection: "Las tareas de hoy se hacen más livianas si las encaramos con confianza, sin miedo a lo que falta.",
  },
  {
    reference: "Filipenses 4, 6",
    verse: "No se inquieten por nada; más bien, en toda ocasión presenten sus peticiones a Dios.",
    reflection: "Si la lista de hoy parece larga, empezá poniéndola en manos de Dios antes que en las propias.",
  },
  {
    reference: "Salmo 37, 5",
    verse: "Encomienda al Señor tu camino, confía en Él, y Él actuará.",
    reflection: "No todo depende de organizarlo perfecto: hay lugar para confiar y soltar un poco el control.",
  },
  {
    reference: "Mateo 6, 34",
    verse: "No se angustien por el mañana, el mañana se angustiará por sí mismo. A cada día le basta su propio afán.",
    reflection: "Hoy alcanza con hacer bien lo de hoy. El resto de la semana puede esperar su turno.",
  },
  {
    reference: "Colosenses 3, 14",
    verse: "Por encima de todo, revístanse del amor, que es el vínculo perfecto.",
    reflection: "En medio de la logística y las tareas, el amor es lo que le da sentido a organizarse juntos.",
  },
  {
    reference: "Gálatas 6, 9",
    verse: "No nos cansemos de hacer el bien, porque a su tiempo cosecharemos si no desfallecemos.",
    reflection: "Las tareas chiquitas de cada día son las que sostienen a la familia a largo plazo.",
  },
  {
    reference: "Salmo 127, 1",
    verse: "Si el Señor no construye la casa, en vano se cansan los que la edifican.",
    reflection: "Buen recordatorio para proyectos y refacciones: planificar es bueno, pero el centro es más grande que nosotros.",
  },
  {
    reference: "Romanos 12, 12",
    verse: "Alégrense en la esperanza, sean pacientes en la tribulación, perseveren en la oración.",
    reflection: "Un día difícil no invalida la alegría de fondo. Se puede sostener las dos cosas juntas.",
  },
  {
    reference: "Eclesiastés 4, 9-10",
    verse: "Más valen dos que uno, porque obtienen más fruto de su trabajo... si caen, el uno levanta al otro.",
    reflection: "Este es, literalmente, el porqué de organizarse en pareja: se sostienen mutuamente.",
  },
  {
    reference: "Proverbios 3, 5-6",
    verse: "Confía en el Señor de todo corazón y no te apoyes en tu propia inteligencia.",
    reflection: "Ni la mejor agenda reemplaza la confianza. Organizá el día, pero sin ansiedad.",
  },
  {
    reference: "Efesios 4, 32",
    verse: "Sean bondadosos y compasivos unos con otros, perdonándose mutuamente.",
    reflection: "Si algo sale distinto a lo planeado hoy, la bondad con el otro vale más que el cronograma.",
  },
];

export const PRAYERS: PrayerOfDay[] = [
  {
    title: "Oración de San Francisco de Asís",
    text: "Señor, hazme un instrumento de tu paz. Donde haya odio, que lleve yo el amor; donde haya ofensa, el perdón; donde haya duda, la fe; donde haya desesperación, la esperanza.",
  },
  {
    title: "Oración por la familia",
    text: "Señor, bendice nuestro hogar. Danos paciencia en el apuro, ternura en el cansancio y alegría para disfrutar juntos cada día.",
  },
  {
    title: "Oración de Santa Teresa de Jesús",
    text: "Nada te turbe, nada te espante, todo se pasa, Dios no se muda. La paciencia todo lo alcanza. Quien a Dios tiene, nada le falta.",
  },
  {
    title: "Padre Nuestro (fragmento)",
    text: "Danos hoy nuestro pan de cada día, y perdona nuestras ofensas, así como nosotros perdonamos a los que nos ofenden.",
  },
  {
    title: "Oración a San José, protector de la familia",
    text: "San José, guardián fiel de la Sagrada Familia, cuida también nuestro hogar, nuestro trabajo y nuestros hijos.",
  },
  {
    title: "Oración de la mañana",
    text: "Señor, este es el día que Tú has hecho. Que sepamos verte en las tareas pequeñas y agradecerte por la familia que nos diste.",
  },
  {
    title: "Oración de confianza",
    text: "Señor, pongo en tus manos lo que hoy no puedo resolver, y te pido fuerzas para lo que sí depende de mí.",
  },
  {
    title: "Ave María (fragmento)",
    text: "Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte.",
  },
  {
    title: "Oración por los hijos",
    text: "Señor, cuida el camino de nuestros hijos, guíalos con tu luz y ayudanos a acompañarlos con paciencia y amor.",
  },
  {
    title: "Oración de gratitud",
    text: "Gracias, Señor, por un nuevo día para estar juntos. Ayudanos a no perder de vista lo que de verdad importa.",
  },
];

// Banco curado de respaldo: se usa cuando las fuentes online no responden.
export function getFallbackContent(date: Date = new Date()) {
  const day = dayOfYear(date);

  return {
    verse: VERSES[day % VERSES.length],
    prayer: PRAYERS[day % PRAYERS.length],
    horoscope: fallbackHoroscopes(date),
  };
}
