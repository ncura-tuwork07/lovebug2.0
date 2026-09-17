"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthInput, AuthLink, AuthShell } from "@/components/auth/AuthShell";

export default function NuevaContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña tiene que tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("El link venció o ya se usó. Pedí uno nuevo.");
      return;
    }
    router.push("/");
    router.refresh();
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
        />
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="lb-btn disabled:opacity-60">
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </AuthShell>
  );
}
