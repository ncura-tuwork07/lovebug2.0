"use client";

import { useState } from "react";
import { CalendarPlus, Check, Copy, RefreshCw } from "lucide-react";
import { getCalendarFeedUrl, rotateCalendarFeed } from "@/app/actions/calendarFeed";
import { BottomSheet } from "@/components/ui/BottomSheet";

// "Sumalo a tu calendario": el calendario de Lovebug dentro de Google Calendar, el del iPhone u
// Outlook, con eventos, traslados, vencimientos y cumples. Se actualiza solo.
export function CalendarSubscribe() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function show() {
    setOpen(true);
    setError(null);
    if (!url) {
      const u = await getCalendarFeedUrl().catch(() => null);
      if (u) setUrl(u);
      else setError("No pudimos armar el link. Probá de nuevo en un rato.");
    }
  }

  async function rotate() {
    if (!confirm("¿Generar un link nuevo? El anterior deja de funcionar y hay que volver a suscribirse en cada calendario.")) return;
    setBusy(true);
    try {
      setUrl(await rotateCalendarFeed());
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos renovarlo.");
    } finally {
      setBusy(false);
    }
  }

  const webcal = url?.replace(/^https?:/, "webcal:");
  const google = webcal ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}` : null;

  return (
    <>
      <button type="button" onClick={show} className="lb-card flex w-full items-center gap-3 !p-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
          <CalendarPlus size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-item font-medium text-ink">Verlo en el calendario del celu</span>
          <span className="block text-meta text-ink-faint">Google Calendar, iPhone u Outlook. Se actualiza solo.</span>
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Sumalo a tu calendario">
        <div className="flex flex-col gap-3">
          <p className="text-body text-ink-soft">
            Todo lo de Lovebug (eventos, traslados, vencimientos y cumples) aparece en el calendario que ya usás, al lado de lo tuyo. Lo que cambien acá se actualiza
            solo; en Google puede tardar unas horas.
          </p>
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {!url && !error && <p className="text-meta text-ink-faint">Armando el link…</p>}
          {url && (
            <>
              <a href={google!} target="_blank" rel="noopener noreferrer" className="lb-btn flex min-h-11 items-center justify-center gap-2">
                Agregar a Google Calendar
              </a>
              <a href={webcal} className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft">
                iPhone, Mac u Outlook
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                  } catch {
                    setError("No pudimos copiarlo. Mantené apretado el link de abajo para copiarlo.");
                  }
                }}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "¡Copiado!" : "Copiar el link"}
              </button>
              <p className="break-all rounded-md bg-line/40 px-3 py-2 font-mono text-[11px] text-ink-faint">{url}</p>
              <p className="text-meta text-ink-faint">
                Es un link secreto: quien lo tenga ve el calendario de la familia. Si se compartió de más, generá uno nuevo.
              </p>
              <button type="button" disabled={busy} onClick={rotate} className="flex min-h-10 items-center justify-center gap-2 text-sm font-semibold text-danger disabled:opacity-50">
                <RefreshCw size={14} /> {busy ? "Generando…" : "Generar un link nuevo"}
              </button>
            </>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
