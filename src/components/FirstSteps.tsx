"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Sparkles, X } from "lucide-react";

export type FirstStep = { key: string; label: string; hint: string; href: string; done: boolean };

const HIDE_KEY = "lb-first-steps-hidden";

// "Primeros pasos" en Hoy: lo mínimo para que Lovebug sirva de verdad. Cada paso se tilda solo
// cuando está hecho; se puede ocultar (queda guardado en este celu) y desaparece al completarlo.
// Los avisos se chequean acá porque dependen de este dispositivo.
export function FirstSteps({ steps: serverSteps, householdId }: { steps: FirstStep[]; householdId: string }) {
  const [hidden, setHidden] = useState(true); // hasta leer el celu, no mostramos nada (sin parpadeo)
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(`${HIDE_KEY}:${householdId}`) === "1");
    } catch {
      setHidden(false);
    }
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      setPushOn(Boolean(await reg?.pushManager.getSubscription()));
    })().catch(() => {});
  }, [householdId]);

  const steps = serverSteps.map((s) => (s.key === "avisos" ? { ...s, done: s.done || pushOn } : s));
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(`${HIDE_KEY}:${householdId}`, "1");
    } catch {}
  }

  return (
    <section className="lb-card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-coral" />
        <h2 className="text-h2 font-display uppercase tracking-wide text-coral">Primeros pasos</h2>
        <span className="ml-auto text-meta font-semibold text-ink-faint">
          {done} de {steps.length}
        </span>
        <button type="button" onClick={hide} aria-label="Ocultar primeros pasos" className="-mr-2 flex h-9 w-9 items-center justify-center text-ink-ghost">
          <X size={16} />
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-track">
        <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="flex flex-col">
        {steps.map((s) => (
          <li key={s.key}>
            <Link href={s.href} className="flex min-h-12 items-center gap-3 py-1.5">
              {s.done ? <CheckCircle2 size={20} className="shrink-0 text-success" /> : <Circle size={20} className="shrink-0 text-line" />}
              <span className="min-w-0 flex-1">
                <span className={`block text-item ${s.done ? "text-ink-faint line-through" : "font-medium text-ink"}`}>{s.label}</span>
                {!s.done && <span className="block text-meta text-ink-faint">{s.hint}</span>}
              </span>
              {!s.done && <ChevronRight size={16} className="shrink-0 text-ink-ghost" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
