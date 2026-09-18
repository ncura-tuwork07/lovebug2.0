"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { setInspiration } from "@/app/actions/household";
import { TRADITIONS } from "@/lib/traditions";
import type { Tradition } from "@/lib/types";

// Primera vez en Hoy: cada hogar elige qué lectura quiere ver (o ninguna) y si quiere horóscopo.
export function InspirationSetup({ compact = false, current, horoscope: initialHoroscope = true }: { compact?: boolean; current?: Tradition | null; horoscope?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tradition, setTradition] = useState<Tradition | null>(current ?? null);
  const [horoscope, setHoroscope] = useState(initialHoroscope);
  const [error, setError] = useState<string | null>(null);

  function save(t: Tradition | null = tradition, h: boolean = horoscope) {
    if (!t) return;
    setError(null);
    start(async () => {
      try {
        await setInspiration({ tradition: t, horoscope: h });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos guardarlo.");
      }
    });
  }

  return (
    <section className={compact ? "" : "lb-card"}>
      {!compact && (
        <>
          <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
            <Sparkles size={16} /> Personalizá tu Hoy
          </h2>
          <p className="mb-3 text-body text-ink-soft">
            Cada mañana podés arrancar con una lectura. Elegí la que va con tu casa (lo cambiás cuando quieras desde Ajustes).
          </p>
        </>
      )}
      <ul className="grid grid-cols-2 gap-2">
        {TRADITIONS.map((t) => {
          const on = tradition === t.key;
          return (
            <li key={t.key}>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setTradition(t.key);
                  if (compact) save(t.key);
                }}
                className={`flex h-full w-full flex-col items-start gap-1 rounded-md border-[1.5px] p-3 text-left transition-colors ${
                  on ? "border-coral bg-coral-soft" : "border-line bg-surface"
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="font-display text-item font-semibold text-ink">{t.label}</span>
                <span className="text-meta text-ink-faint">{t.desc}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <label className="mt-3 flex items-center gap-3">
        <input
          type="checkbox"
          checked={horoscope}
          disabled={pending}
          onChange={(e) => {
            setHoroscope(e.target.checked);
            if (compact) save(tradition, e.target.checked);
          }}
          className="h-5 w-5 accent-coral"
        />
        <span className="text-item text-ink">
          Horóscopo del día
          <span className="block text-meta text-ink-faint">Según la fecha de nacimiento de cada adulto. Si no va con ustedes, lo sacan.</span>
        </span>
      </label>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {!compact && (
        <button type="button" disabled={pending || !tradition} onClick={() => save()} className="lb-btn mt-3 disabled:opacity-50">
          {pending ? "Guardando…" : "Listo"}
        </button>
      )}
    </section>
  );
}
