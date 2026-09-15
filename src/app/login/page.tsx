"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#1E293B] px-6">
      <div className="text-center">
        <Logo size={56} variant="dark" className="mx-auto" />
        <h1 className="mt-2 font-display text-2xl font-bold">
          <span className="text-white">Love</span>
          <span className="text-coral">bug</span>
        </h1>
        <p className="font-accent text-2xl text-white/60">La familia, siempre en foco.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="lb-input"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="lb-input"
        />

        {error && <p className="text-sm text-coral">{error}</p>}

        <button type="submit" disabled={loading} className="lb-btn disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
