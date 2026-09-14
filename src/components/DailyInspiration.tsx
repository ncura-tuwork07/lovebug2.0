import { BookHeart, HandHeart, Sparkle } from "lucide-react";
import { getDailyContent } from "@/lib/content/daily";

export function DailyInspiration() {
  const { verse, prayer, horoscope } = getDailyContent();

  return (
    <section className="flex flex-col gap-4">
      <div className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
          <BookHeart size={16} /> Cita bíblica del día
        </h2>
        <p className="font-accent text-2xl leading-tight text-ink">&ldquo;{verse.verse}&rdquo;</p>
        <p className="mt-1 text-meta font-semibold text-coral">{verse.reference}</p>
        <p className="mt-3 text-body text-ink-soft">{verse.reflection}</p>
      </div>

      <div className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
          <HandHeart size={16} /> {prayer.title}
        </h2>
        <p className="text-body text-ink-soft">{prayer.text}</p>
      </div>

      <div className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
          <Sparkle size={16} /> Horóscopo del día
        </h2>
        <div className="flex flex-col gap-3 text-item">
          <div>
            <p className="font-semibold text-ink">Naza · Aries</p>
            <p className="text-ink-soft">{horoscope.aries}</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Jazmín · Acuario</p>
            <p className="text-ink-soft">{horoscope.acuario}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
