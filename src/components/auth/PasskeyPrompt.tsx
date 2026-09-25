"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { dismissPasskeyOffer, registerThisDevice, shouldOfferPasskey } from "@/lib/passkeyClient";

// Justo después de entrar con la contraseña: "¿Querés entrar con tu huella la próxima vez?".
// Si decís que sí, el celu te pide la huella (o el patrón) en ese momento y queda activado.
export function PasskeyPrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let justLoggedIn = false;
    try {
      justLoggedIn = sessionStorage.getItem("lb-offer-passkey") === "1";
      sessionStorage.removeItem("lb-offer-passkey");
    } catch {}
    if (!justLoggedIn) return;
    shouldOfferPasskey().then((ok) => {
      if (ok) setTimeout(() => setOpen(true), 600);
    });
  }, []);

  if (!open) return null;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await registerThisDevice();
      setDone(true);
      setTimeout(() => setOpen(false), 1800);
    } catch (e) {
      // Si cancelaste el aviso de la huella, no es un error: queda para otra vez.
      if (e instanceof Error && e.name === "NotAllowedError") {
        setBusy(false);
        return;
      }
      setError(e instanceof Error ? e.message : "No pudimos activarla. Probá desde Ajustes.");
    } finally {
      setBusy(false);
    }
  }

  function later() {
    dismissPasskeyOffer();
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-[calc(24px+env(safe-area-inset-bottom))]" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-sheet bg-cream p-6 shadow-pop">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral-soft text-coral">
          <Fingerprint size={30} />
        </span>
        {done ? (
          <p className="mt-4 text-center font-display text-h2 font-bold text-ink">¡Listo! La próxima entrás con tu huella.</p>
        ) : (
          <>
            <h2 className="mt-4 text-center font-display text-h1 font-bold text-ink">¿Entrás con tu huella la próxima vez?</h2>
            <p className="mt-2 text-center text-body text-ink-soft">
              Así no tenés que escribir la contraseña. Usa la huella o el patrón de este celu, y lo podés sacar cuando quieras desde Ajustes.
            </p>
            {error && <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" disabled={busy} onClick={activate} className="lb-btn disabled:opacity-60">
                {busy ? "Esperando tu huella…" : "Sí, activar huella"}
              </button>
              <button type="button" disabled={busy} onClick={later} className="min-h-11 text-sm font-semibold text-ink-faint">
                Ahora no
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
