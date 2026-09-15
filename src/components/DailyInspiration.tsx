import { BookHeart, HandHeart, Sparkle } from "lucide-react";
import { getDailyContent } from "@/lib/daily";
import { todayAR } from "@/lib/format";
import { ExpandableText } from "@/components/ui/ExpandableText";

export async function DailyInspiration() {
  const c = await getDailyContent(todayAR());

  return (
    <section className="flex flex-col gap-4">
      <div className="lb-card">
        <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
          <BookHeart size={16} /> Evangelio del día
        </h2>
        {c.saint && <p className="mb-3 text-meta text-ink-faint">{c.saint}</p>}
        {c.verse_text && (
          <ExpandableText text={`“${c.verse_text}”`} limit={300} className="font-accent text-2xl leading-tight text-ink" />
        )}
        {c.verse_reference && <p className="mt-1 text-meta font-semibold text-coral">{c.verse_reference}</p>}
        {c.reflection && <p className="mt-3 text-body text-ink-soft">{c.reflection}</p>}
      </div>

      {c.prayer_text && (
        <div className="lb-card">
          <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
            <HandHeart size={16} /> {c.prayer_title ?? "Oración del día"}
          </h2>
          <p className="whitespace-pre-line text-body text-ink-soft">{c.prayer_text}</p>
        </div>
      )}

      {c.horoscope && (
        <div className="lb-card">
          <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
            <Sparkle size={16} /> Horóscopo del día
          </h2>
          <div className="flex flex-col gap-3 text-item">
            <div>
              <p className="font-semibold text-ink">Naza · Aries</p>
              <p className="text-ink-soft">{c.horoscope.aries}</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Jazmín · Acuario</p>
              <p className="text-ink-soft">{c.horoscope.acuario}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
