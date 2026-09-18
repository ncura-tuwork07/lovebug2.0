import Link from "next/link";
import { BookHeart, Flame, HandHeart, Sparkle } from "lucide-react";
import { getDailyContent } from "@/lib/daily";
import { getInspiration } from "@/lib/inspiration";
import { traditionOf } from "@/lib/traditions";
import { todayAR } from "@/lib/format";
import { zodiacFor } from "@/lib/zodiac";
import type { HouseholdSettings, Member } from "@/lib/types";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { InspirationSetup } from "@/components/InspirationSetup";

export async function DailyInspiration({ members, settings }: { members: Member[]; settings: HouseholdSettings | null }) {
  const tradition = traditionOf(settings);
  // Primera vez: el hogar elige qué quiere ver acá.
  if (!tradition) return <InspirationSetup />;

  const showHoroscope = settings?.inspiration?.horoscope !== false;
  const today = todayAR();
  const [insp, daily] = await Promise.all([getInspiration(tradition, today), showHoroscope ? getDailyContent(today) : null]);

  // Horóscopo de los adultos del hogar, según su fecha de nacimiento.
  const signs = members
    .filter((m) => !m.is_child)
    .map((m) => ({ member: m, sign: zodiacFor(m.birthday) }))
    .filter((x) => x.sign);

  const accent = insp.tradition === "ninguna" ? "text-info" : "text-coral";

  return (
    <section className="flex flex-col gap-4">
      <div className="lb-card">
        <h2 className={`text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide ${accent}`}>
          <BookHeart size={16} /> {insp.heading}
        </h2>
        {insp.kicker && <p className="mb-3 text-meta text-ink-faint">{insp.kicker}</p>}
        {insp.text && <ExpandableText text={`“${insp.text}”`} limit={300} className="font-accent text-2xl leading-tight text-ink" />}
        {insp.reference && <p className={`mt-1 text-meta font-semibold ${accent}`}>{insp.reference}</p>}
        {insp.reflection && <p className="mt-3 text-body text-ink-soft">{insp.reflection}</p>}
      </div>

      {insp.shabbat && (insp.shabbat.candles || insp.shabbat.havdalah) && (
        <div className="lb-card !bg-amber-soft">
          <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
            <Flame size={16} /> Shabat Shalom
          </h2>
          <p className="text-body text-ink">
            {insp.shabbat.candles}
            {insp.shabbat.havdalah ? ` · ${insp.shabbat.havdalah}` : ""}
          </p>
          <p className="text-meta text-ink-faint">Horarios de Buenos Aires.</p>
        </div>
      )}

      {insp.prayer && (
        <div className="lb-card">
          <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
            <HandHeart size={16} /> {insp.prayer.title}
          </h2>
          <p className="whitespace-pre-line text-body text-ink-soft">{insp.prayer.text}</p>
        </div>
      )}

      {showHoroscope && daily?.horoscope && (
        <div className="lb-card">
          <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
            <Sparkle size={16} /> Horóscopo del día
          </h2>
          {signs.length === 0 ? (
            <p className="text-body text-ink-soft">
              Cargá tu fecha de nacimiento en{" "}
              <Link href="/familia" className="font-semibold text-coral">
                tu perfil
              </Link>{" "}
              para ver tu horóscopo acá.
            </p>
          ) : (
            <div className="flex flex-col gap-3 text-item">
              {signs.map(({ member, sign }) => (
                <div key={member.id}>
                  <p className="font-semibold text-ink">
                    {member.nickname ?? member.name} · {sign!.emoji} {sign!.label}
                  </p>
                  <p className="text-ink-soft">{daily.horoscope?.[sign!.key] ?? "Hoy, con calma y en familia."}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
