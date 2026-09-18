// "Pensamiento del día" para hogares sin contenido religioso: frases sobre familia, casa,
// paciencia y cuidado. Citas de dominio público o de autoría propia; ninguna religiosa.

export type Thought = { text: string; author: string | null; reflection: string };

export const THOUGHTS: Thought[] = [
  { text: "No es que tengamos poco tiempo, sino que perdemos mucho.", author: "Séneca", reflection: "Un rato de verdad con los tuyos vale más que una tarde entera mirando el celular al lado." },
  { text: "La felicidad de tu vida depende de la calidad de tus pensamientos.", author: "Marco Aurelio", reflection: "Arrancá el día eligiendo en qué vas a poner la cabeza: en lo que falta o en lo que ya está." },
  { text: "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.", author: "Aristóteles", reflection: "Las rutinas chicas de la casa (la mesa puesta, la mochila lista) son las que sostienen todo lo demás." },
  { text: "Elige un trabajo que ames y no tendrás que trabajar ni un día de tu vida.", author: "Confucio", reflection: "Y si hoy el trabajo no se ama, que al menos la vuelta a casa sí." },
  { text: "La paciencia es amarga, pero su fruto es dulce.", author: "Jean-Jacques Rousseau", reflection: "Con los chicos, con la pareja, con uno mismo: contar hasta tres cambia la tarde." },
  { text: "Donde hay amor, hay vida.", author: "Mahatma Gandhi", reflection: "La casa no se llena con cosas sino con las ganas de volver." },
  { text: "Un viaje de mil millas empieza con un solo paso.", author: "Lao-Tsé", reflection: "Ese proyecto de la casa que parece enorme empieza hoy con una sola tarea tachada." },
  { text: "Lo esencial es invisible a los ojos.", author: "Antoine de Saint-Exupéry", reflection: "Nadie va a recordar si el piso estaba impecable; sí si había lugar para reírse." },
  { text: "La vida es lo que pasa mientras estás ocupado haciendo otros planes.", author: "Allen Saunders", reflection: "Planificá, sí, pero dejá un hueco en la agenda para lo que no se planifica." },
  { text: "El hogar no es un lugar, es una sensación.", author: null, reflection: "Hoy podés fabricarla con algo mínimo: una comida rica, música, una charla sin apuro." },
  { text: "Nadie se queda pobre por dar.", author: "Ana Frank", reflection: "Un gesto generoso con alguien de la familia hoy vuelve multiplicado." },
  { text: "El mejor momento para plantar un árbol fue hace veinte años. El segundo mejor es ahora.", author: "Proverbio", reflection: "Lo mismo vale para el ahorro, la rutina de sueño o esa charla pendiente." },
  { text: "Sé amable, pues cada persona que conoces está librando una dura batalla.", author: "Atribuida a Platón", reflection: "Eso incluye a quien vive con vos. Un poco de ternura extra hoy no sobra." },
  { text: "La sencillez es la máxima sofisticación.", author: "Leonardo da Vinci", reflection: "Menos actividades, menos cosas, más presencia. La casa también respira mejor." },
  { text: "El que tiene un porqué para vivir puede soportar casi cualquier cómo.", author: "Friedrich Nietzsche", reflection: "Cuando el día se pone cuesta arriba, mirá para quién lo hacés." },
  { text: "Todo lo que somos es el resultado de lo que hemos pensado.", author: "Buda", reflection: "Un día que arranca con gratitud rara vez termina mal." },
  { text: "Los niños necesitan más modelos que críticos.", author: "Joseph Joubert", reflection: "Lo que hacés cuando creés que no te miran es la lección que se llevan." },
  { text: "No hay nada permanente, excepto el cambio.", author: "Heráclito", reflection: "La etapa agotadora de hoy también pasa. Sacale una foto, porque después se extraña." },
  { text: "La gratitud convierte lo que tenemos en suficiente.", author: null, reflection: "Antes de la lista de pendientes, una lista mental de tres cosas que hoy ya están bien." },
  { text: "Cuidar de mí no es egoísmo: es lo que me deja cuidar a los demás.", author: null, reflection: "Reservá un rato para vos hoy, aunque sean diez minutos. La casa lo nota." },
  { text: "Hacé de cada día tu obra maestra.", author: "John Wooden", reflection: "No hace falta que sea perfecto; que tenga una cosa hecha con cariño alcanza." },
  { text: "El descanso también es parte del trabajo.", author: null, reflection: "Si hoy la energía no da, bajar un cambio es una decisión inteligente, no una derrota." },
  { text: "Mejor hecho que perfecto.", author: null, reflection: "La cena de hoy, la tarea del colegio, el arreglo del baño: terminado gana." },
  { text: "Lo que se mide, mejora.", author: null, reflection: "Anotar los gastos o las tareas no es control: es darle un rumbo a la semana." },
  { text: "La alegría compartida es doble alegría; la pena compartida es media pena.", author: "Proverbio", reflection: "Contale a alguien de casa algo lindo que te pasó hoy, aunque sea chiquito." },
  { text: "Quien no sabe adónde va, cualquier camino le sirve.", author: "Proverbio", reflection: "Una meta clara para esta semana (una sola) ordena todas las demás decisiones." },
  { text: "El orden exterior ayuda al orden interior.", author: null, reflection: "Cinco minutos ordenando un rincón hoy despejan más que una hora de vueltas en la cabeza." },
  { text: "Las cosas buenas llevan tiempo.", author: null, reflection: "El ahorro, los hijos, la pareja: lo importante se construye a fuego lento." },
  { text: "Hay que escuchar el doble de lo que se habla; por eso tenemos dos orejas y una boca.", author: "Zenón de Citio", reflection: "Hoy probá preguntar cómo está el otro y quedarte callado un rato más." },
  { text: "Ninguna nube dura para siempre.", author: null, reflection: "Si la semana viene pesada, hoy alcanza con cumplir lo mínimo y ser amable." },
];

export function thoughtForDay(dayOfYear: number): Thought {
  return THOUGHTS[dayOfYear % THOUGHTS.length];
}
