"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase/client";
import { getPasskeyLoginOptions, verifyPasskeyLogin } from "@/app/actions/passkeys";

export function PasskeyLoginButton({ next, onError }: { next: string; onError: (message: string | null) => void }) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  if (!supported) return null;

  async function handleClick() {
    onError(null);
    setBusy(true);
    try {
      const { options, challengeId } = await getPasskeyLoginOptions();
      const response = await startAuthentication({ optionsJSON: options });
      const { email, token } = await verifyPasskeyLogin({ challengeId, response });
      const { error } = await createClient().auth.verifyOtp({ email, token, type: "magiclink" });
      if (error) throw new Error("No pudimos iniciar sesión. Probá con tu email y contraseña.");
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.name !== "NotAllowedError") onError(e.message || "No pudimos entrar con huella. Probá con tu email y contraseña.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleClick}
      className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-white/25 px-4 text-sm font-semibold text-white disabled:opacity-50"
    >
      <Fingerprint size={16} /> Entrar con huella o cara
    </button>
  );
}
