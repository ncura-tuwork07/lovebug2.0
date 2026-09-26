"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { enrollNativeDevice, nativeUnlock, removeNativeDevice } from "@/app/actions/nativeUnlock";
import {
  forgetNativeUnlock,
  isNativeApp,
  isNativeCancel,
  nativeBiometricAvailable,
  nativeUnlockSaved,
  readNativeUnlock,
  saveNativeUnlock,
} from "@/lib/native";
import { LadybugLoader } from "@/components/ui/LadybugLoader";

// Activa la huella del celu (app Android): el servidor da un secreto nuevo y el celu lo guarda
// detrás de la huella. Si el celu no llega a guardarlo, se borra del servidor.
export async function activateNativeUnlock(): Promise<void> {
  if (!(await nativeBiometricAvailable())) throw new Error("Este celu no tiene huella (ni cara) configurada. Cargala en los ajustes del teléfono y volvé.");
  const { userId, token, deviceId } = await enrollNativeDevice(navigator.userAgent.match(/Android[^;)]*;\s*([^;)]+)/)?.[1]?.trim() || "Celular");
  try {
    await saveNativeUnlock(userId, token, deviceId);
  } catch (e) {
    await removeNativeDevice(deviceId).catch(() => {});
    throw e;
  }
}

// "Entrar con huella" dentro de la app: el cartel propio del celu (como Mercado Pago). Con `auto`
// aparece solo al abrir la pantalla. Solo se muestra si este celu ya tiene la huella activada.
export function NativeUnlockButton({ next, auto = false, onError, onUnavailable }: { next: string; auto?: boolean; onError: (m: string | null) => void; onUnavailable?: () => void }) {
  const [state, setState] = useState<"checking" | "none" | "idle" | "waiting" | "entering">("checking");
  const tried = useRef(false);

  async function go() {
    onError(null);
    setState("waiting");
    try {
      const creds = await readNativeUnlock();
      setState("entering");
      await nativeUnlock(creds);
      window.location.replace(next.startsWith("/") ? next : "/");
    } catch (e) {
      if (isNativeCancel(e)) return setState("idle");
      const message = e instanceof Error ? e.message : "";
      // El secreto ya no sirve (se agregó una huella al celu, o se apagó desde Ajustes): a activarla de nuevo.
      if (/ya no es válida|invalid|permanently|No protected credentials|not found/i.test(message)) {
        await forgetNativeUnlock();
        setState("none");
        onUnavailable?.();
        onError("La huella de este celu cambió o se desactivó. Entrá con tu contraseña y activala de nuevo desde Ajustes.");
        return;
      }
      setState("idle");
      onError(message || "No pudimos confirmar la huella. Probá de nuevo o entrá con tu contraseña.");
    }
  }

  useEffect(() => {
    (async () => {
      const saved = isNativeApp() && (await nativeUnlockSaved());
      setState(saved ? "idle" : "none");
      if (!saved) onUnavailable?.();
      if (saved && auto && !tried.current) {
        tried.current = true;
        go();
      }
    })();
    // Solo al montar: el cartel automático aparece una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "checking" || state === "none") return null;
  return (
    <>
      <button type="button" disabled={state !== "idle"} onClick={go} className="lb-btn flex w-full items-center justify-center gap-2 disabled:opacity-60">
        <Fingerprint size={18} /> {state === "waiting" ? "Esperando tu huella…" : "Entrar con huella"}
      </button>
      {state === "entering" && (
        <div className="lb-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/95">
          <LadybugLoader variant="dark" label="Entrando…" size={34} />
        </div>
      )}
    </>
  );
}

// Ajustes, dentro de la app Android: activar o apagar la huella del celu.
export function NativeUnlockSection() {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    nativeUnlockSaved().then(setSaved);
  }, []);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      await activateNativeUnlock();
      setSaved(true);
    } catch (e) {
      if (!isNativeCancel(e)) setError(e instanceof Error ? e.message : "No pudimos activarla. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    setError(null);
    try {
      const deviceId = await forgetNativeUnlock();
      if (deviceId) await removeNativeDevice(deviceId).catch(() => {});
      setSaved(false);
    } finally {
      setBusy(false);
    }
  }

  if (saved === null) return null;
  return (
    <section className="lb-card">
      <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-ink">
        <Fingerprint size={16} /> Entrar con huella
      </h2>
      <p className="mb-3 text-body text-ink-soft">
        Con la huella (o la cara) de este celu, con el cartel del propio teléfono, como en el home banking. Te la pide cada vez que abrís Lovebug.
      </p>
      {error && <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {saved ? (
        <div className="flex items-center gap-3">
          <span className="flex flex-1 items-center gap-2 text-item font-semibold text-success">
            <CheckCircle2 size={18} /> Activada en este celu
          </span>
          <button type="button" disabled={busy} onClick={deactivate} className="min-h-11 rounded-md px-3 text-sm font-semibold text-danger disabled:opacity-50">
            Desactivar
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={activate} className="lb-btn flex w-full items-center justify-center gap-2 disabled:opacity-60">
          <Fingerprint size={16} /> {busy ? "Esperando tu huella…" : "Activar la huella de este celu"}
        </button>
      )}
    </section>
  );
}
