import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getFallbackContent } from "@/lib/content/daily";
import type { DailyContent } from "@/lib/types";

// Contenido "del día" para Hoy. Fuentes:
//  - Evangelio, comentario y santo del día: publication.evangelizo.ws (católico, en español,
//    sigue el calendario litúrgico real).
//  - Horóscopo: freehoroscopeapi.com (en inglés).
//  - Con ANTHROPIC_API_KEY: Claude escribe la reflexión familiar, la oración del día y
//    adapta el horóscopo al español. Sin la key: comentario de Evangelizo + banco curado.
// Se cachea en la tabla daily_content: una sola consulta a las fuentes por día.

const EVANGELIZO = "https://publication.evangelizo.ws/SP/days";
const HOROSCOPE = "https://freehoroscopeapi.com/api/v1/get-horoscope/daily";
const TIMEOUT_MS = 8000;

type Reading = {
  type: string;
  reading_code: string;
  text: string;
  book?: { full_title?: string };
};

type Evangelizo = {
  liturgic_title: string | null;
  gospel: { reference: string; text: string; book: string } | null;
  commentary: { title: string | null; text: string | null; author: string | null } | null;
  saints: string[];
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: 0 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function clean(text: string): string {
  return text
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function trimAtSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut.trimEnd() + "…").trim();
}

async function fetchEvangelizo(day: string): Promise<Evangelizo | null> {
  const [dayRes, commRes, saintsRes] = await Promise.all([
    getJson<{ data: { liturgic_title: string | null; readings: Reading[] } }>(`${EVANGELIZO}/${day}`),
    getJson<{ data: { title: string | null; description: string | null; author?: { name?: string } | string | null } }>(
      `${EVANGELIZO}/${day}/commentary`
    ),
    getJson<{ data: { name: string }[] }>(`${EVANGELIZO}/${day}/saints`),
  ]);
  if (!dayRes?.data) return null;

  const gospelReading = dayRes.data.readings?.find((r) => r.type === "gospel");
  const author = commRes?.data?.author;
  return {
    liturgic_title: dayRes.data.liturgic_title ?? null,
    gospel: gospelReading
      ? {
          reference: gospelReading.reading_code,
          text: clean(gospelReading.text),
          book: gospelReading.book?.full_title ?? "Evangelio",
        }
      : null,
    commentary: commRes?.data
      ? {
          title: commRes.data.title ?? null,
          text: commRes.data.description ? clean(commRes.data.description) : null,
          author: typeof author === "string" ? author : author?.name ?? null,
        }
      : null,
    saints: (saintsRes?.data ?? []).map((s) => s.name).filter(Boolean).slice(0, 3),
  };
}

async function fetchHoroscopeEn(sign: "aries" | "aquarius"): Promise<string | null> {
  const res = await getJson<{ data?: { horoscope?: string } }>(`${HOROSCOPE}?sign=${sign}&day=today`);
  return res?.data?.horoscope ?? null;
}

type Generated = {
  reflection: string;
  prayer_title: string;
  prayer_text: string;
  horoscope: { aries: string; acuario: string };
};

async function generateWithClaude(input: {
  day: string;
  liturgic_title: string | null;
  gospel: Evangelizo["gospel"];
  commentary: Evangelizo["commentary"];
  saints: string[];
  ariesEn: string | null;
  aquariusEn: string | null;
}): Promise<Generated | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  const system = `Escribís para Lovebug, la app privada de organización familiar de Nazareno (Naza, Aries) y Jazmín (Jaz, Acuario), una pareja católica argentina con hijos. Tono: cálido, cercano, español rioplatense (voseo), nunca corporativo ni cursi. Respondé únicamente con un objeto JSON válido, sin texto antes ni después, con exactamente estas claves:
{"reflection": string, "prayer_title": string, "prayer_text": string, "horoscope": {"aries": string, "acuario": string}}
- reflection: 2 o 3 oraciones que conecten el Evangelio de hoy con la vida familiar concreta (la casa, los chicos, la pareja, el trabajo). Podés apoyarte en el comentario provisto, sin copiarlo.
- prayer_title: título corto (ej. "Oración de la mañana", "Oración a San X"). Si hay santo del día, podés inspirarte en él.
- prayer_text: oración breve (3 a 5 líneas), católica, en primera persona del plural, pidiendo por la familia y el día.
- horoscope.aries / horoscope.acuario: adaptación al español de los horóscopos en inglés, 1 o 2 oraciones cada uno, en segunda persona (vos), con un guiño práctico al día a día en familia. Sin promesas absolutas ni tono fatalista.`;

  const user = JSON.stringify(
    {
      fecha: input.day,
      titulo_liturgico: input.liturgic_title,
      evangelio: input.gospel,
      comentario: input.commentary,
      santos_del_dia: input.saints,
      horoscopo_en: { aries: input.ariesEn, acuario: input.aquariusEn },
    },
    null,
    1
  );

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") return null;

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Generated;
    if (!parsed.reflection || !parsed.horoscope?.aries || !parsed.horoscope?.acuario) return null;
    return parsed;
  } catch (e) {
    console.error("[daily] Claude generation failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getDailyContent(day: string): Promise<DailyContent> {
  const supabase = await createClient();

  const { data: cached } = await supabase.from("daily_content").select("*").eq("day", day).maybeSingle();
  if (cached) return cached as DailyContent;

  const [ev, ariesEn, aquariusEn] = await Promise.all([
    fetchEvangelizo(day),
    fetchHoroscopeEn("aries"),
    fetchHoroscopeEn("aquarius"),
  ]);

  const fallback = getFallbackContent(new Date(`${day}T12:00:00-03:00`));

  // Si Evangelizo no respondió, devolvemos el banco curado sin cachear, para reintentar en la próxima carga.
  if (!ev) {
    return {
      day,
      verse_text: fallback.verse.verse,
      verse_reference: fallback.verse.reference,
      reflection: fallback.verse.reflection,
      prayer_title: fallback.prayer.title,
      prayer_text: fallback.prayer.text,
      saint: null,
      horoscope: fallback.horoscope,
      source: "fallback",
    };
  }

  const generated = await generateWithClaude({
    day,
    liturgic_title: ev.liturgic_title,
    gospel: ev.gospel,
    commentary: ev.commentary,
    saints: ev.saints,
    ariesEn,
    aquariusEn,
  });

  const reflection =
    generated?.reflection ??
    (ev.commentary?.text
      ? trimAtSentence(ev.commentary.text, 420) + (ev.commentary.author ? ` — ${ev.commentary.author}` : "")
      : fallback.verse.reflection);

  const content: DailyContent = {
    day,
    verse_text: ev.gospel?.text ?? fallback.verse.verse,
    verse_reference: ev.gospel ? `${ev.gospel.book} ${ev.gospel.reference}` : fallback.verse.reference,
    reflection,
    prayer_title: generated?.prayer_title ?? fallback.prayer.title,
    prayer_text: generated?.prayer_text ?? fallback.prayer.text,
    saint: [ev.liturgic_title, ...ev.saints].filter(Boolean).join(" · ") || null,
    horoscope: generated?.horoscope ?? fallback.horoscope,
    source: generated ? "evangelizo+claude" : "evangelizo",
  };

  await supabase.from("daily_content").upsert(content, { onConflict: "day" });
  return content;
}
