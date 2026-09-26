"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthInput, AuthLink, AuthShell } from "@/components/auth/AuthShell";
import { PasskeyLoginButton } from "@/components/auth/PasskeyLoginButton";
import { confirmDeviceUnlock } from "@/app/actions/appLock";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "link" ? "El link del email venció o ya se usó. Pedí uno nuevo desde “¿Olvidaste tu contraseña?”." : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    setLoading(false);

    if (error) {
      setError(/confirm/i.test(error.message) ? "Todavía no confirmaste tu email. Revisá tu casilla." : "Email o contraseña incorrectos.");
      return;
    }

    // Recién entraste con contraseña: adentro te ofrecemos activar la huella en este celu.
    try {
      sessionStorage.setItem("lb-offer-passkey", "1");
    } catch {}
    // La contraseña ya prueba quién sos: no hace falta pedir la huella de nuevo al entrar.
    try {
      await confirmDeviceUnlock();
    } catch {}
    // Navegación completa: arranca de cero con las cookies recién puestas (sesión + desbloqueo).
    window.location.replace(next.startsWith("/") ? next : "/");
  }

  return (
    <AuthShell
      footer={
        <>
          <AuthLink href="/restablecer">¿Olvidaste tu contraseña?</AuthLink>
          <span>
            ¿No tenés cuenta? <AuthLink href="/registro">Creá tu hogar</AuthLink>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthInput type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthInput
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="lb-btn disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <PasskeyLoginButton next={next} onError={setError} />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
