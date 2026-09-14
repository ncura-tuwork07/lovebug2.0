import { BookHeart, HandHeart, Sparkle } from "lucide-react";
import { getDailyContent } from "@/lib/content/daily";

export function DailyInspiration() {
  const { verse, prayer, horoscope } = getDailyContent();

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm shadow-rose-100">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-500">
          <BookHeart size={16} /> Cita bíblica del día
        </h2>
        <p className="text-sm italic text-slate-700">&ldquo;{verse.verse}&rdquo;</p>
        <p className="mt-1 text-xs font-semibold text-rose-400">{verse.reference}</p>
        <p className="mt-3 text-sm text-slate-500">{verse.reflection}</p>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm shadow-rose-100">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-500">
          <HandHeart size={16} /> {prayer.title}
        </h2>
        <p className="text-sm text-slate-600">{prayer.text}</p>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm shadow-rose-100">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-rose-500">
          <Sparkle size={16} /> Horóscopo del día
        </h2>
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold text-slate-700">Naza · Aries</p>
            <p className="text-slate-500">{horoscope.aries}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Jazmín · Acuario</p>
            <p className="text-slate-500">{horoscope.acuario}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
