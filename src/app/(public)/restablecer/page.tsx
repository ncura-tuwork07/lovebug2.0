"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthInput, AuthLink, AuthShell } from "@/components/auth/AuthShell";

export default function RestablecerPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer/nueva`,
    });
    setLoading(false);
    if (error) {
      setError("No pudimos mandar el email. Revisá la dirección y probá de nuevo.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title="Revisá tu email"
        subtitle={`Si ${email.trim()} tiene cuenta, te llega un link para elegir una contraseña nueva.`}
        footer={<AuthLink href="/login">Volver</AuthLink>}
      >
        <div className="lb-card flex flex-col items-center gap-2 text-center">
          <MailCheck className="text-success" size={32} />
          <p className="text-body text-ink-soft">Puede tardar un minuto. Mirá también en spam.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te mandamos un link por email." footer={<AuthLink href="/login">Volver</AuthLink>}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthInput type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="lb-btn disabled:opacity-60">
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>
    </AuthShell>
  );
}
