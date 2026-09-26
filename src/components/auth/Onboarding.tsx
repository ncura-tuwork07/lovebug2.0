"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createHousehold, joinHousehold } from "@/app/actions/household";
import { confirmDeviceUnlock } from "@/app/actions/appLock";
import { AuthInput, AuthShell, RoleInput } from "@/components/auth/AuthShell";

type Mode = "create" | "join";

export function Onboarding({
  defaultName,
  defaultRole,
  defaultHouseholdName,
  defaultCode,
  email,
}: {
  defaultName: string;
  defaultRole: string;
  defaultHouseholdName: string;
  defaultCode: string;
  email: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultCode ? "join" : "create");
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState(defaultRole);
  const [householdName, setHouseholdName] = useState(defaultHouseholdName);
  const [code, setCode] = useState(defaultCode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "create") await createHousehold({ name: householdName, memberName: name, role });
      else await joinHousehold({ code, memberName: name, role });
      await confirmDeviceUnlock();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardarlo. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Último paso"
      subtitle={`Estás entrando como ${email}.`}
      footer={
        <button
          type="button"
          className="font-semibold text-white/70"
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.href = "/";
          }}
        >
          Salir y usar otra cuenta
        </button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-white/10 p-1">
        {(["create", "join"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`min-h-10 rounded-[10px] text-sm font-semibold transition-colors ${mode === m ? "bg-white text-ink" : "text-white/70"}`}
          >
            {m === "create" ? "Crear un hogar" : "Tengo un código"}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthInput required placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        <RoleInput value={role} onChange={setRole} />
        {mode === "create" ? (
          <AuthInput
            required
            placeholder="Nombre del hogar (ej. Los Curitas)"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            maxLength={40}
          />
        ) : (
          <AuthInput
            required
            placeholder="Código de invitación"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
            className="uppercase tracking-widest"
          />
        )}
        {error && <p className="text-sm text-coral">{error}</p>}
        <button type="submit" disabled={loading} className="lb-btn disabled:opacity-60">
          {loading ? "Guardando..." : mode === "create" ? "Crear mi hogar" : "Sumarme"}
        </button>
      </form>
    </AuthShell>
  );
}
