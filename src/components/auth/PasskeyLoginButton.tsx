"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { getPasskeyLoginOptions, verifyPasskeyLogin } from "@/app/actions/passkeys";
import { deviceHasPasskey, forgetDevicePasskey, rememberDevicePasskey } from "@/lib/passkeyClient";
import { LadybugLoader } from "@/components/ui/LadybugLoader";
import { isNativeApp } from "@/lib/native";
import { NativeUnlockButton } from "@/components/auth/NativeUnlock";

// Solo aparece en dispositivos donde ya se activó la huella (si no, el celu diría
// "no hay llaves de acceso"). La primera vez se entra con contraseña y ahí se ofrece activarla.
export function PasskeyLoginButton({ next, onError }: { next: string; onError: (message: string | null) => void }) {
  const [available, setAvailable] = useState(false);
  const [native, setNative] = useState(false);
  const [nativeReady, setNativeReady] = useState(true);
  const [phase, setPhase] = useState<"idle" | "waiting" | "entering">("idle");

  useEffect(() => {
    // En la app Android: el cartel de huella del celu, que aparece solo al abrir el login.
    if (isNativeApp()) return setNative(true);
    setAvailable(browserSupportsWebAuthn() && deviceHasPasskey());
  }, []);

  if (native) {
    return (
      <>
        {nativeReady && (
          <div className="my-3 flex items-center gap-2 text-xs text-white/40">
            <span className="h-px flex-1 bg-white/15" />o<span className="h-px flex-1 bg-white/15" />
          </div>
        )}
        <NativeUnlockButton next={next} auto onError={onError} onUnavailable={() => setNativeReady(false)} />
      </>
    );
  }
  if (!available) return null;

  async function handleClick() {
    onError(null);
    setPhase("waiting");
    try {
      const { options, challengeId } = await getPasskeyLoginOptions();
      const response = await startAuthentication({ optionsJSON: options });
      setPhase("entering");
      // El servidor verifica la huella y deja la sesión abierta (cookies) en la misma respuesta.
      await verifyPasskeyLogin({ challengeId, response });
      rememberDevicePasskey(response.id);
      window.location.replace(next.startsWith("/") ? next : "/");
    } catch (e) {
      setPhase("idle");
      if (e instanceof Error && e.name === "NotAllowedError") return; // canceló la huella
      const message = e instanceof Error ? e.message : "";
      // La llave se borró desde Ajustes (o desde otro dispositivo): dejamos de ofrecer el botón acá.
      if (/No reconocemos/.test(message)) {
        forgetDevicePasskey();
        setAvailable(false);
        onError("La huella de este celu ya no está activa. Entrá con tu contraseña y la volvés a activar.");
        return;
      }
      onError(message || "No pudimos entrar con la huella. Probá con tu email y contraseña.");
    }
  }

  return (
    <>
      <div className="my-3 flex items-center gap-2 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/15" />o<span className="h-px flex-1 bg-white/15" />
      </div>
      <button
        type="button"
        disabled={phase !== "idle"}
        onClick={handleClick}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-white/25 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Fingerprint size={18} /> {phase === "waiting" ? "Esperando tu huella…" : "Entrar con huella"}
      </button>
      {phase === "entering" && (
        <div className="lb-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/95">
          <LadybugLoader variant="dark" label="Entrando…" size={34} />
        </div>
      )}
    </>
  );
}
