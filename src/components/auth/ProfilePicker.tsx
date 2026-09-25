"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { chooseProfile } from "@/app/actions/session";
import { Logo } from "@/components/Logo";
import type { Member } from "@/lib/types";

// El "¿Quién sos?" estilo Netflix: un mismo login alcanza para todo el hogar, y cada quien
// elige su perfil al entrar. Se puede cambiar en cualquier momento desde el header.
export function ProfilePicker({ members, householdName }: { members: Member[]; householdName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(id: string) {
    setPicked(id);
    setError(null);
    start(async () => {
      try {
        await chooseProfile(id);
        router.push("/");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos elegir ese perfil.");
        setPicked(null);
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <Logo size={44} className="mx-auto" />
        <p className="mt-3 font-display text-xl font-bold text-ink">¿Quién sos?</p>
        <p className="mt-1 text-body text-ink-faint">{householdName}</p>
      </div>

      <div className="grid w-full grid-cols-3 gap-4">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={pending}
            onClick={() => pick(m.id)}
            className="flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <span
              className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl font-display text-3xl font-bold text-white shadow-card transition-transform ${
                picked === m.id ? "scale-95 ring-4 ring-coral" : "active:scale-95"
              }`}
              style={{ backgroundColor: m.color }}
            >
              {m.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                m.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="text-item font-semibold text-ink">{m.nickname ?? m.name}</span>
          </button>
        ))}
        <Link href="/familia" className="flex flex-col items-center gap-2">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-line text-ink-ghost">
            <Plus size={28} />
          </span>
          <span className="text-item font-semibold text-ink-faint">Agregar</span>
        </Link>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
