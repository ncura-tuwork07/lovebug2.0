"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { joinHousehold } from "@/app/actions/household";
import { AuthInput, AuthShell, RoleInput } from "@/components/auth/AuthShell";

type Mode = "signup" | "login";

export function InviteJoin({ code, householdName, loggedIn }: { code: string; householdName: string; loggedIn: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function finishJoin() {
    await joinHousehold({ code, memberName: name, role });
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      if (loggedIn) {
        await finishJoin();
        return;
      }
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error("Email o contraseña incorrectos.");
        await finishJoin();
        return;
      }
      if (password.length < 8) throw new Error("La contraseña tiene que tener al menos 8 caracteres.");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), role: role.trim(), invite_code: code },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/empezar`,
        },
      });
      if (error) {
        if (/already|registered/i.test(error.message)) throw new Error("Ese email ya tiene cuenta. Elegí “Ya tengo cuenta”.");
        throw new Error(error.message);
      }
      if (data.user && data.user.identities?.length === 0) throw new Error("Ese email ya tiene cuenta. Elegí “Ya tengo cuenta”.");
      if (data.session) {
        await finishJoin();
        return;
      }
      setCheckEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos sumarte. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthShell title="Revisá tu email" subtitle={`Te mandamos un link a ${email.trim()} para confirmar la cuenta.`}>
        <div className="lb-card flex flex-col items-center gap-2 text-center">
          <MailCheck className="text-success" size={32} />
          <p className="text-body text-ink-soft">Abrilo y te sumamos a {householdName} automáticamente.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={`Te invitaron a ${householdName}`} subtitle="Sumate para ver y cargar todo lo del hogar, en tiempo real.">
      {!loggedIn && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-white/10 p-1">
          {(["signup", "login"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`min-h-10 rounded-[10px] text-sm font-semibold transition-colors ${
                mode === m ? "bg-white text-ink" : "text-white/70"
              }`}
            >
              {m === "signup" ? "Crear cuenta" : "Ya tengo cuenta"}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthInput required autoComplete="given-name" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        <RoleInput value={role} onChange={setRole} />
        {!loggedIn && (
          <>
            <AuthInput type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <AuthInput
              type="password"
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Contraseña (mínimo 8)" : "Contraseña"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="lb-btn disabled:opacity-60">
          {loading ? "Sumándote..." : `Sumarme a ${householdName}`}
        </button>
      </form>
    </AuthShell>
  );
}
