// Enseñanzas para hogares judíos: Torá, Tehilim (Salmos), Mishlei (Proverbios) y Pirkei Avot,
// con una reflexión para la casa. Traducciones propias, sin Nuevo Testamento ni santos.

export type Teaching = { reference: string; text: string; reflection: string };

export const TEACHINGS: Teaching[] = [
  { reference: "Devarim (Deuteronomio) 6, 6-7", text: "Estas palabras que hoy te ordeno estarán sobre tu corazón; las repetirás a tus hijos y hablarás de ellas al estar en tu casa y al andar por el camino.", reflection: "Lo que enseñamos en casa se enseña en lo cotidiano: en la mesa, en el auto, al acostarlos." },
  { reference: "Pirkei Avot 1, 14", text: "Si yo no soy para mí, ¿quién será para mí? Y si solo soy para mí, ¿qué soy? Y si no es ahora, ¿cuándo?", reflection: "Cuidarte, cuidar a los tuyos y no dejar para mañana lo que la familia necesita hoy." },
  { reference: "Tehilim (Salmos) 127, 1", text: "Si el Eterno no construye la casa, en vano trabajan los que la edifican.", reflection: "Planificar está bien; recordar que no todo depende de nosotros da descanso." },
  { reference: "Mishlei (Proverbios) 22, 6", text: "Educa al niño en su camino, y aun cuando envejezca no se apartará de él.", reflection: "Cada rutina chica de hoy es un hábito que los va a acompañar toda la vida." },
  { reference: "Vayikrá (Levítico) 19, 18", text: "Amarás a tu prójimo como a ti mismo.", reflection: "El prójimo más cercano es quien duerme en la pieza de al lado." },
  { reference: "Pirkei Avot 2, 21", text: "No te corresponde terminar la tarea, pero tampoco eres libre de abandonarla.", reflection: "Ese proyecto de la casa que no termina nunca: hoy alcanza con un paso más." },
  { reference: "Tehilim (Salmos) 133, 1", text: "¡Miren qué bueno y qué agradable es que los hermanos convivan unidos!", reflection: "Una comida juntos, sin pantallas, es una forma sencilla de shalom bait." },
  { reference: "Bereshit (Génesis) 2, 18", text: "No es bueno que el hombre esté solo.", reflection: "Pedir ayuda en casa no es debilidad: es para eso que somos familia." },
  { reference: "Mishlei (Proverbios) 15, 1", text: "La respuesta suave calma el enojo; la palabra hiriente aviva la ira.", reflection: "Antes de contestar a los gritos, una respiración. Cambia toda la tarde." },
  { reference: "Pirkei Avot 4, 1", text: "¿Quién es rico? El que se alegra con su porción.", reflection: "Hoy, antes de mirar lo que falta, agradecé lo que ya hay en la mesa." },
  { reference: "Shemot (Éxodo) 20, 8", text: "Recuerda el día de Shabat para santificarlo.", reflection: "Parar una vez por semana no es perder tiempo: es lo que le da sentido al resto." },
  { reference: "Tehilim (Salmos) 23, 1", text: "El Eterno es mi pastor, nada me faltará.", reflection: "En una semana apretada de cuentas, confiar también es una decisión." },
  { reference: "Mishlei (Proverbios) 31, 26", text: "Abre su boca con sabiduría, y en su lengua hay enseñanza de bondad.", reflection: "Las palabras que usamos en casa son el clima en el que crecen los chicos." },
  { reference: "Pirkei Avot 1, 15", text: "Habla poco y haz mucho, y recibe a toda persona con rostro amable.", reflection: "Una cara amable al volver del trabajo vale más que mil promesas." },
  { reference: "Devarim (Deuteronomio) 30, 19", text: "He puesto delante de ti la vida y la muerte, la bendición y la maldición: elige la vida.", reflection: "Cada día elegimos: quejarnos o construir. Hoy, construir." },
  { reference: "Tehilim (Salmos) 118, 24", text: "Este es el día que hizo el Eterno; alegrémonos y regocijémonos en él.", reflection: "No hace falta que pase algo especial para que hoy sea un buen día." },
  { reference: "Mishlei (Proverbios) 3, 5-6", text: "Confía en el Eterno con todo tu corazón y no te apoyes en tu propio entendimiento.", reflection: "Cuando no sabés qué decisión tomar por los chicos, dormir una noche también es sabiduría." },
  { reference: "Pirkei Avot 2, 5", text: "No juzgues a tu compañero hasta que estés en su lugar.", reflection: "Antes de reprochar a tu pareja, preguntate cómo fue su día." },
  { reference: "Bereshit (Génesis) 12, 2", text: "Y serás bendición.", reflection: "La familia no es solo para adentro: hoy alguien afuera puede necesitar una mano." },
  { reference: "Tehilim (Salmos) 90, 12", text: "Enséñanos a contar nuestros días, para que adquiramos un corazón sabio.", reflection: "Los años con chicos chicos se pasan volando. Anotá un recuerdo de hoy." },
  { reference: "Mishlei (Proverbios) 17, 22", text: "El corazón alegre es buena medicina.", reflection: "Un chiste en la cena cura más que muchos sermones." },
  { reference: "Pirkei Avot 5, 23", text: "Según el esfuerzo es la recompensa.", reflection: "Lo que hoy cuesta (ahorrar, estudiar, ordenar) es lo que mañana se disfruta." },
  { reference: "Vayikrá (Levítico) 19, 32", text: "Ante las canas te pondrás de pie y honrarás el rostro del anciano.", reflection: "Un llamado a los abuelos hoy. Cinco minutos que valen una semana." },
  { reference: "Micá (Miqueas) 6, 8", text: "¿Qué pide el Eterno de ti? Practicar la justicia, amar la bondad y caminar humildemente con tu Dios.", reflection: "Tres cosas para la casa: ser justos, ser buenos, no creerse más que el otro." },
];

export function teachingForDay(dayOfYear: number): Teaching {
  return TEACHINGS[dayOfYear % TEACHINGS.length];
}

export type ShabbatInfo = { parasha: string | null; candles: string | null; havdalah: string | null };

// Parashá de la semana y horario de velas (Buenos Aires) vía Hebcal. Cacheado 6 horas.
export async function fetchShabbatInfo(): Promise<ShabbatInfo | null> {
  try {
    const res = await fetch("https://www.hebcal.com/shabbat?cfg=json&geonameid=3435910&M=on&lg=es", {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { items?: { category: string; title: string; hebrew?: string; date: string }[] };
    const items = json.items ?? [];
    const parasha = items.find((i) => i.category === "parashat")?.title ?? null;
    const candles = items.find((i) => i.category === "candles")?.title ?? null;
    const havdalah = items.find((i) => i.category === "havdalah")?.title ?? null;
    return { parasha, candles, havdalah };
  } catch {
    return null;
  }
}
