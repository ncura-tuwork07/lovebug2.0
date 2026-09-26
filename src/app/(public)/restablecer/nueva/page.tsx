"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { confirmDeviceUnlock } from "@/app/actions/appLock";
import { AuthInput, AuthLink, AuthShell } from "@/components/auth/AuthShell";
import { LadybugLoader } from "@/components/ui/LadybugLoader";

type Phase = "checking" | "ready" | "invalid" | "saving" | "done";

// Llega desde el link del email. El link trae la sesión en la dirección (#access_token=…) o, en
// links viejos, un ?code=. La guardamos, borramos el rastro de la barra y pedimos la contraseña.
export default function NuevaContrasenaPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      try {
        if (hash.get("error_description")) throw new Error(hash.get("error_description")!);
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else if (query.get("code")) {
          const { error } = await supabase.auth.exchangeCodeForSession(query.get("code")!);
          if (error) throw error;
        }
        window.history.replaceState(null, "", "/restablecer/nueva");
        const { data } = await supabase.auth.getSession();
        setPhase(data.session ? "ready" : "invalid");
      } catch {
        window.history.replaceState(null, "", "/restablecer/nueva");
        setPhase("invalid");
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña tiene que tener al menos 8 caracteres.");
      return;
    }
    setPhase("saving");
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setPhase("ready");
      setError(/different|same/i.test(error.message) ? "Elegí una contraseña distinta de la anterior." : "No pudimos guardarla. Pedí un link nuevo y probá otra vez.");
      return;
    }
    // Entró con el link del email: ya probó quién es, así que no le pedimos la huella al toque.
    await confirmDeviceUnlock().catch(() => {});
    setPhase("done");
    setTimeout(() => window.location.replace("/"), 1200);
  }

  if (phase === "checking") {
    return (
      <AuthShell title="Contraseña nueva">
        <LadybugLoader variant="dark" label="Revisando el link…" />
      </AuthShell>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthShell title="El link ya no sirve" subtitle="Venció o ya se usó. Pedí uno nuevo y abrilo apenas te llegue." footer={<AuthLink href="/login">Volver</AuthLink>}>
        <a href="/restablecer" className="lb-btn flex w-full justify-center">
          Pedir otro link
        </a>
      </AuthShell>
    );
  }

  if (phase === "done") {
    return (
      <AuthShell title="¡Listo!" subtitle="Tu contraseña nueva ya quedó. Entrando…">
        <LadybugLoader variant="dark" label={null} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Contraseña nueva" subtitle="Elegí una que no uses en otro lado." footer={<AuthLink href="/restablecer">Pedir otro link</AuthLink>}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthInput
          type="password"
          required
          autoComplete="new-password"
          placeholder="Contraseña nueva (mínimo 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoFocus
        />
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={phase === "saving"} className="lb-btn disabled:opacity-60">
          {phase === "saving" ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
