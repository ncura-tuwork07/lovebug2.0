"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createHousehold } from "@/app/actions/household";
import { confirmDeviceUnlock } from "@/app/actions/appLock";
import { AuthInput, AuthLink, AuthShell, RoleInput } from "@/components/auth/AuthShell";

export default function RegistroPage() {
  const [householdName, setHouseholdName] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (password.length < 8) throw new Error("La contraseña tiene que tener al menos 8 caracteres.");
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), role: role.trim(), household_name: householdName.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/empezar`,
        },
      });
      if (error) {
        if (/already|registered/i.test(error.message)) throw new Error("Ese email ya tiene cuenta. Probá entrar.");
        throw new Error(error.message);
      }
      if (data.user && data.user.identities?.length === 0) throw new Error("Ese email ya tiene cuenta. Probá entrar.");

      if (data.session) {
        await createHousehold({ name: householdName, memberName: name, role });
        await confirmDeviceUnlock();
        window.location.replace("/");
        return;
      }
      setCheckEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell title="Revisá tu email" subtitle={`Te mandamos un link a ${email.trim()} para confirmar la cuenta.`}>
        <div className="lb-card flex flex-col items-center gap-2 text-center">
          <MailCheck className="text-success" size={32} />
          <p className="text-body text-ink-soft">Abrilo desde este mismo celu y terminás de crear tu hogar en un toque.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Creá tu hogar"
      subtitle="Gratis. Después invitás a quien quieras con un link: pareja, familia, amigos."
      footer={
        <span>
          ¿Ya tenés cuenta? <AuthLink href="/login">Entrar</AuthLink>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthInput
          required
          placeholder="Nombre del hogar (ej. Los Curitas)"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          maxLength={40}
        />
        <AuthInput required autoComplete="given-name" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        <RoleInput value={role} onChange={setRole} />
        <AuthInput type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthInput
          type="password"
          required
          autoComplete="new-password"
          placeholder="Contraseña (mínimo 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
        />
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="lb-btn disabled:opacity-60">
          {loading ? "Creando..." : "Crear mi hogar"}
        </button>
        <p className="text-center text-xs text-white/40">Sin publicidad ni tarjetas. Podés borrar tu cuenta cuando quieras.</p>
      </form>
    </AuthShell>
  );
}
