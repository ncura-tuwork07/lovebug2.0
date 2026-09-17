import Link from "next/link";
import { BookHeart, HandHeart, Sparkle } from "lucide-react";
import { getDailyContent } from "@/lib/daily";
import { todayAR } from "@/lib/format";
import { zodiacFor } from "@/lib/zodiac";
import type { HouseholdSettings, Member } from "@/lib/types";
import { ExpandableText } from "@/components/ui/ExpandableText";

export async function DailyInspiration({ members, settings }: { members: Member[]; settings: HouseholdSettings | null }) {
  const showGospel = settings?.inspiration?.gospel !== false;
  const showHoroscope = settings?.inspiration?.horoscope !== false;
  if (!showGospel && !showHoroscope) return null;

  const c = await getDailyContent(todayAR());
  // Horóscopo de los adultos del hogar, según su fecha de nacimiento.
  const adults = members.filter((m) => !m.is_child);
  const signs = adults.map((m) => ({ member: m, sign: zodiacFor(m.birthday) })).filter((x) => x.sign);

  return (
    <section className="flex flex-col gap-4">
      {showGospel && (
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
      )}

      {showGospel && c.prayer_text && (
        <div className="lb-card">
          <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
            <HandHeart size={16} /> {c.prayer_title ?? "Oración del día"}
          </h2>
          <p className="whitespace-pre-line text-body text-ink-soft">{c.prayer_text}</p>
        </div>
      )}

      {showHoroscope && c.horoscope && (
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
                  <p className="text-ink-soft">{c.horoscope?.[sign!.key] ?? "Hoy, con calma y en familia."}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
