// Signo zodiacal a partir de la fecha de nacimiento (YYYY-MM-DD).
export type ZodiacKey =
  | "aries" | "tauro" | "geminis" | "cancer" | "leo" | "virgo"
  | "libra" | "escorpio" | "sagitario" | "capricornio" | "acuario" | "piscis";

export const ZODIAC: { key: ZodiacKey; label: string; en: string; emoji: string; from: [number, number] }[] = [
  { key: "capricornio", label: "Capricornio", en: "capricorn", emoji: "♑", from: [12, 22] },
  { key: "acuario", label: "Acuario", en: "aquarius", emoji: "♒", from: [1, 20] },
  { key: "piscis", label: "Piscis", en: "pisces", emoji: "♓", from: [2, 19] },
  { key: "aries", label: "Aries", en: "aries", emoji: "♈", from: [3, 21] },
  { key: "tauro", label: "Tauro", en: "taurus", emoji: "♉", from: [4, 20] },
  { key: "geminis", label: "Géminis", en: "gemini", emoji: "♊", from: [5, 21] },
  { key: "cancer", label: "Cáncer", en: "cancer", emoji: "♋", from: [6, 21] },
  { key: "leo", label: "Leo", en: "leo", emoji: "♌", from: [7, 23] },
  { key: "virgo", label: "Virgo", en: "virgo", emoji: "♍", from: [8, 23] },
  { key: "libra", label: "Libra", en: "libra", emoji: "♎", from: [9, 23] },
  { key: "escorpio", label: "Escorpio", en: "scorpio", emoji: "♏", from: [10, 23] },
  { key: "sagitario", label: "Sagitario", en: "sagittarius", emoji: "♐", from: [11, 22] },
];

export const ZODIAC_KEYS = ZODIAC.map((z) => z.key);

export function zodiacFor(birthday: string | null | undefined) {
  if (!birthday || birthday.length < 10) return null;
  const month = Number(birthday.slice(5, 7));
  const day = Number(birthday.slice(8, 10));
  if (!month || !day) return null;
  // Recorre los signos en orden de fecha de inicio; el último cuyo inicio ya pasó es el signo.
  const ordered = [...ZODIAC].sort((a, b) => a.from[0] - b.from[0] || a.from[1] - b.from[1]);
  let match = ordered[ordered.length - 1]; // capricornio (arranca el 22/12)
  for (const z of ordered) {
    if (month > z.from[0] || (month === z.from[0] && day >= z.from[1])) match = z;
  }
  return match;
}
