import "server-only";
import { getDailyContent } from "@/lib/daily";
import { PRAYERS, VERSES } from "@/lib/content/daily";
import { dayOfYear } from "@/lib/content/horoscope";
import { fetchShabbatInfo, teachingForDay, type ShabbatInfo } from "@/lib/content/jewish";
import { thoughtForDay } from "@/lib/content/secular";
import type { Tradition } from "@/lib/types";

export type Inspiration = {
  tradition: Tradition;
  heading: string; // "Evangelio del día", "Palabra del día", …
  kicker: string | null; // título litúrgico / santos / parashá
  text: string;
  reference: string | null;
  reflection: string | null;
  prayer: { title: string; text: string } | null;
  shabbat: ShabbatInfo | null;
};

// Contenido espiritual (o secular) de Hoy según la tradición del hogar.
export async function getInspiration(tradition: Tradition, day: string): Promise<Inspiration> {
  const date = new Date(`${day}T12:00:00-03:00`);
  const doy = dayOfYear(date);

  if (tradition === "catolica") {
    const c = await getDailyContent(day);
    return {
      tradition,
      heading: "Evangelio del día",
      kicker: c.saint,
      text: c.verse_text ?? "",
      reference: c.verse_reference,
      reflection: c.reflection,
      prayer: c.prayer_text ? { title: c.prayer_title ?? "Oración del día", text: c.prayer_text } : null,
      shabbat: null,
    };
  }

  if (tradition === "cristiana") {
    const verse = VERSES[doy % VERSES.length];
    const prayers = PRAYERS.filter((p) => !p.catholicOnly);
    const prayer = prayers[doy % prayers.length];
    return {
      tradition,
      heading: "Palabra del día",
      kicker: null,
      text: verse.verse,
      reference: verse.reference,
      reflection: verse.reflection,
      prayer: { title: prayer.title, text: prayer.text },
      shabbat: null,
    };
  }

  if (tradition === "judia") {
    const t = teachingForDay(doy);
    const dow = date.getUTCDay(); // 5 = viernes, 6 = sábado
    const shabbat = dow === 5 || dow === 6 || dow === 4 ? await fetchShabbatInfo() : null;
    return {
      tradition,
      heading: "Enseñanza del día",
      kicker: shabbat?.parasha ?? null,
      text: t.text,
      reference: t.reference,
      reflection: t.reflection,
      prayer: null,
      shabbat,
    };
  }

  const th = thoughtForDay(doy);
  return {
    tradition: "ninguna",
    heading: "Pensamiento del día",
    kicker: null,
    text: th.text,
    reference: th.author,
    reflection: th.reflection,
    prayer: null,
    shabbat: null,
  };
}
