"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Lock } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase/client";
import { getUnlockOptions, verifyAppUnlock } from "@/app/actions/appLock";
import { deviceHasPasskey, rememberDevicePasskey } from "@/lib/passkeyClient";
import { isNativeApp } from "@/lib/native";
import { NativeUnlockButton } from "@/components/auth/NativeUnlock";
import { AuthShell } from "@/components/auth/AuthShell";
import { LadybugLoader } from "@/components/ui/LadybugLoader";

// Si algo se traba (red lenta, el celu no devuelve la huella), el botón se libera solo.
const WATCHDOG_MS = 20_000;

export function AppLockScreen({ next }: { next: string }) {
  // null mientras se chequea localStorage, para no mostrar el botón que no corresponde ni un instante.
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  // En la app Android se usa el cartel de huella del propio celu (null = todavía no sabemos).
  const [native, setNative] = useState<boolean | null>(null);
  const [nativeReady, setNativeReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNative(isNativeApp());
    setHasPasskey(deviceHasPasskey());
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => {
      setBusy(false);
      setEntering(false);
      setError("Tardó demasiado. Probá de nuevo o entrá con tu contraseña.");
    }, WATCHDOG_MS);
    return () => clearTimeout(t);
  }, [busy]);

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      const { options, challengeId } = await getUnlockOptions();
      const response = await startAuthentication({ optionsJSON: options });
      setEntering(true);
      await verifyAppUnlock({ challengeId, response });
      rememberDevicePasskey(response.id);
      // Navegación completa (no la del router): arranca de cero con la cookie recién puesta.
      window.location.replace(next);
    } catch (e) {
      setBusy(false);
      setEntering(false);
      if (e instanceof Error && e.name === "NotAllowedError") return; // canceló la huella
      setError(e instanceof Error && e.message ? e.message : "No pudimos confirmar la huella. Probá de nuevo.");
    }
  }

  async function goToPassword() {
    await createClient().auth.signOut();
    window.location.replace(next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }

  if (hasPasskey === null || native === null) return null;

  if (native) {
    return (
      <AuthShell title="Lovebug está bloqueado" subtitle={nativeReady ? "Poné tu huella para seguir." : "Activá la huella desde Ajustes después de entrar."}>
        <div className="flex flex-col items-center gap-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
            <Lock size={28} />
          </span>
          {error && <p className="text-center text-sm text-coral">{error}</p>}
          <NativeUnlockButton next={next} auto onError={setError} onUnavailable={() => setNativeReady(false)} />
          <button
            type="button"
            onClick={goToPassword}
            className={nativeReady ? "min-h-11 text-sm font-semibold text-white/70 underline-offset-4 hover:underline" : "lb-btn w-full"}
          >
            {nativeReady ? "Entrar con mi contraseña" : "Entrar con tu contraseña"}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Lovebug está bloqueado"
      subtitle={hasPasskey ? "Mostrá tu huella para seguir." : "Este dispositivo no tiene la huella activada."}
    >
      <div className="flex flex-col items-center gap-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
          <Lock size={28} />
        </span>
        {error && <p className="text-center text-sm text-coral">{error}</p>}
        {hasPasskey ? (
          <>
            <button type="button" disabled={busy} onClick={unlock} className="lb-btn flex w-full items-center justify-center gap-2 disabled:opacity-60">
              <Fingerprint size={18} /> {busy ? "Esperando tu huella…" : "Mostrar mi huella"}
            </button>
            {/* Siempre hay una salida: si la huella falla o se traba, se entra con la contraseña. */}
            <button type="button" onClick={goToPassword} className="min-h-11 text-sm font-semibold text-white/70 underline-offset-4 hover:underline">
              Entrar con mi contraseña
            </button>
          </>
        ) : (
          <button type="button" onClick={goToPassword} className="lb-btn w-full">
            Entrar con tu contraseña
          </button>
        )}
      </div>
      {entering && (
        <div className="lb-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/95">
          <LadybugLoader variant="dark" label="Entrando…" size={34} />
        </div>
      )}
    </AuthShell>
  );
}
