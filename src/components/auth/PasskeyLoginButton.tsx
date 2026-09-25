"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase/client";
import { getPasskeyLoginOptions, verifyPasskeyLogin } from "@/app/actions/passkeys";
import { deviceHasPasskey, forgetDevicePasskey, rememberDevicePasskey } from "@/lib/passkeyClient";

// Solo aparece en dispositivos donde ya se activó la huella (si no, el celu diría
// "no hay llaves de acceso"). La primera vez se entra con contraseña y ahí se ofrece activarla.
export function PasskeyLoginButton({ next, onError }: { next: string; onError: (message: string | null) => void }) {
  const router = useRouter();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAvailable(browserSupportsWebAuthn() && deviceHasPasskey()), []);

  if (!available) return null;

  async function handleClick() {
    onError(null);
    setBusy(true);
    try {
      const { options, challengeId } = await getPasskeyLoginOptions();
      const response = await startAuthentication({ optionsJSON: options });
      const { email, token } = await verifyPasskeyLogin({ challengeId, response });
      const { error } = await createClient().auth.verifyOtp({ email, token, type: "magiclink" });
      if (error) throw new Error("No pudimos iniciar sesión. Probá con tu email y contraseña.");
      rememberDevicePasskey(response.id);
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (e) {
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="my-3 flex items-center gap-2 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/15" />o<span className="h-px flex-1 bg-white/15" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={handleClick}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-white/25 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Fingerprint size={18} /> {busy ? "Esperando tu huella…" : "Entrar con huella"}
      </button>
    </>
  );
}
