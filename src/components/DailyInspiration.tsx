import { BookHeart, HandHeart, Sparkle } from "lucide-react";
import { getDailyContent } from "@/lib/content/daily";

export function DailyInspiration() {
  const { verse, prayer, horoscope } = getDailyContent();

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <BookHeart size={16} /> Cita bíblica del día
        </h2>
        <p className="text-sm italic text-ink/80">&ldquo;{verse.verse}&rdquo;</p>
        <p className="mt-1 text-xs font-semibold text-primary">{verse.reference}</p>
        <p className="mt-3 text-sm text-ink/50">{verse.reflection}</p>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <HandHeart size={16} /> {prayer.title}
        </h2>
        <p className="text-sm text-ink/60">{prayer.text}</p>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
          <Sparkle size={16} /> Horóscopo del día
        </h2>
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold text-ink/80">Naza · Aries</p>
            <p className="text-ink/50">{horoscope.aries}</p>
          </div>
          <div>
            <p className="font-semibold text-ink/80">Jazmín · Acuario</p>
            <p className="text-ink/50">{horoscope.acuario}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
