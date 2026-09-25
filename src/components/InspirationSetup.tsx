"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, Sparkles } from "lucide-react";
import { requestTradition, setInspiration } from "@/app/actions/household";
import { TRADITIONS } from "@/lib/traditions";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { Tradition } from "@/lib/types";

// Primera vez en Hoy: cada hogar elige qué lectura quiere ver (o ninguna) y si quiere horóscopo.
// Si su religión no está en la lista, la anotamos para sumarla más adelante y mientras tanto usan "Sin religión".
export function InspirationSetup({
  compact = false,
  current,
  horoscope: initialHoroscope = true,
  otherLabel: initialOtherLabel,
}: {
  compact?: boolean;
  current?: Tradition | null;
  horoscope?: boolean;
  otherLabel?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tradition, setTradition] = useState<Tradition | null>(current ?? null);
  const [horoscope, setHoroscope] = useState(initialHoroscope);
  const [error, setError] = useState<string | null>(null);
  const [askingOther, setAskingOther] = useState(false);
  const [otherLabel, setOtherLabel] = useState(initialOtherLabel ?? "");
  const [otherNote, setOtherNote] = useState("");
  const [thanked, setThanked] = useState(false);

  function save(t: Tradition | null = tradition, h: boolean = horoscope) {
    if (!t) return;
    if (t === "otra") {
      setAskingOther(true);
      return;
    }
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

  function submitOther() {
    if (!otherLabel.trim()) {
      setError("Contanos cuál es tu religión, así queda anotado.");
      return;
    }
    setError(null);
    start(async () => {
      try {
        await requestTradition({ label: otherLabel, note: otherNote || null, horoscope });
        setThanked(true);
        setAskingOther(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos guardarlo.");
      }
    });
  }

  if (thanked) {
    return (
      <section className={compact ? "" : "lb-card"}>
        <div className="flex items-start gap-3 rounded-md bg-success-soft p-4">
          <HeartHandshake size={22} className="mt-0.5 shrink-0 text-success" />
          <div>
            <p className="font-display font-semibold text-ink">¡Gracias por tu comentario!</p>
            <p className="mt-1 text-body text-ink-soft">
              Anotamos que te gustaría ver contenido de <b>{otherLabel}</b>. Lo vamos a tener en cuenta para próximas mejoras y te avisamos
              apenas tengamos una novedad — todavía no podemos prometer fecha.
            </p>
            <p className="mt-2 text-body text-ink-soft">
              Mientras tanto vas a ver <b>Sin religión</b> en Hoy: es solo el contenido que mostramos, no significa que seas ateo. Lo cambiás
              cuando quieras desde Ajustes.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (askingOther) {
    return (
      <section className={compact ? "" : "lb-card"}>
        {!compact && (
          <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
            <Sparkles size={16} /> ¿Cuál es tu religión?
          </h2>
        )}
        <p className="mb-3 text-body text-ink-soft">
          Todavía no la tenemos armada, pero queremos sumarla. Contanos cuál es y, si querés, agregá un comentario.
        </p>
        <div className="flex flex-col gap-3">
          <Field label="Tu religión">
            <Input
              value={otherLabel}
              onChange={(e) => setOtherLabel(e.target.value)}
              placeholder="Musulmana, budista, mormona…"
              maxLength={60}
              autoFocus
            />
          </Field>
          <Field label="Comentario (opcional)">
            <Textarea
              value={otherNote}
              onChange={(e) => setOtherNote(e.target.value)}
              placeholder="Contanos qué te gustaría ver: una cita del día, una oración, un horario de oración…"
              rows={2}
            />
          </Field>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={pending} onClick={submitOther} className="lb-btn disabled:opacity-50">
            {pending ? "Enviando…" : "Enviar"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setAskingOther(false);
              setTradition(current ?? null);
            }}
            className="min-h-11 rounded-md px-4 text-sm font-semibold text-ink-faint"
          >
            Volver
          </button>
        </div>
      </section>
    );
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
                  if (compact || t.key === "otra") save(t.key);
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
      {current === "otra" && initialOtherLabel && !askingOther && (
        <p className="mt-2 text-meta text-ink-faint">
          Pediste <b>{initialOtherLabel}</b>. Todavía usás Sin religión mientras tanto.
        </p>
      )}
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
