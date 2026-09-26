"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Lock } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase/client";
import { getUnlockOptions, verifyAppUnlock } from "@/app/actions/appLock";
import { deviceHasPasskey, devicePasskeyId, forgetDevicePasskey } from "@/lib/passkeyClient";
import { AuthShell } from "@/components/auth/AuthShell";

export function AppLockScreen({ next }: { next: string }) {
  const router = useRouter();
  // null mientras se chequea localStorage, para no mostrar el botón que no corresponde ni un instante.
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setHasPasskey(deviceHasPasskey()), []);

  async function unlock() {
    const credentialId = devicePasskeyId();
    if (!credentialId) return;
    setBusy(true);
    setError(null);
    try {
      const { options, challengeId } = await getUnlockOptions(credentialId);
      const response = await startAuthentication({ optionsJSON: options });
      await verifyAppUnlock({ challengeId, response });
      router.push(next);
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.name === "NotAllowedError") {
        setBusy(false);
        return;
      }
      const message = e instanceof Error ? e.message : "";
      // La llave se borró desde Ajustes (o desde otro dispositivo): pasamos al modo sin huella.
      if (/ya no está activa/.test(message)) {
        forgetDevicePasskey();
        setHasPasskey(false);
        setBusy(false);
        return;
      }
      setError(message || "No pudimos confirmar la huella. Probá de nuevo.");
      setBusy(false);
    }
  }

  async function useSignOut() {
    await createClient().auth.signOut();
    window.location.href = next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";
  }

  if (hasPasskey === null) return null;

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
          <button type="button" disabled={busy} onClick={unlock} className="lb-btn flex w-full items-center justify-center gap-2 disabled:opacity-60">
            <Fingerprint size={18} /> {busy ? "Esperando tu huella…" : "Mostrar mi huella"}
          </button>
        ) : (
          <button type="button" onClick={useSignOut} className="lb-btn w-full">
            Entrar con tu contraseña
          </button>
        )}
      </div>
    </AuthShell>
  );
}
