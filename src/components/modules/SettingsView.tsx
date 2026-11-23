"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookHeart, Check, ChevronRight, LogOut, ShieldCheck, Sparkle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setModuleEnabled, updateHouseholdName } from "@/app/actions/household";
import { InspirationSetup } from "@/components/InspirationSetup";
import { traditionOf } from "@/lib/traditions";
import { MODULES, isModuleEnabled } from "@/lib/modules";
import type { Household, Member, UserPasskey } from "@/lib/types";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { PushSetup } from "@/components/PushSetup";
import { PasskeysSection } from "@/components/settings/PasskeysSection";
import { AndroidAppCard } from "@/components/settings/AndroidAppCard";
import { CalendarSubscribe } from "@/components/modules/CalendarSubscribe";

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors before:absolute before:-inset-2 before:content-[""] disabled:opacity-40 ${checked ? "bg-coral" : "bg-track"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "left-1 translate-x-5" : "left-1"}`} />
    </button>
  );
}

export function SettingsView({
  household,
  members,
  me,
  email,
  isAdmin,
  passkeys,
}: {
  household: Household;
  members: Member[];
  me: Member;
  email: string;
  isAdmin: boolean;
  passkeys: UserPasskey[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(household.name);
  const [error, setError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  function act(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos guardarlo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {/* Nombre del hogar */}
      <section className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
          <Users size={16} /> Hogar
        </h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await updateHouseholdName(name);
              setNameSaved(true);
              setTimeout(() => setNameSaved(false), 2000);
            });
          }}
        >
          <input className="lb-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Nombre del hogar" />
          <button type="submit" disabled={pending || name.trim() === household.name} className="lb-btn shrink-0 !px-4 disabled:opacity-50">
            {nameSaved ? <Check size={18} /> : "Guardar"}
          </button>
        </form>
        <ul className="mt-4 flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.id}>
              <Link href={`/familia/${m.id}`} className="flex items-center gap-3">
                <MemberAvatar member={m} size={32} />
                <span className="flex-1 text-item text-ink">
                  {m.name}
                  {m.id === me.id && <span className="text-meta text-ink-faint"> · vos</span>}
                </span>
                <span className="text-meta text-ink-faint">{m.role}{m.user_id ? " · con cuenta" : ""}</span>
                <ChevronRight size={16} className="text-ink-ghost" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-meta text-ink-faint">
          Los que no tienen cuenta usan este mismo login: al entrar eligen su perfil, como en Netflix.
        </p>
        <Link href="/familia" className="mt-3 inline-block text-sm font-semibold text-coral">
          Agregar integrantes →
        </Link>
      </section>

      {/* Módulos */}
      <section className="lb-card">
        <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-info">
          <Sparkle size={16} /> Módulos
        </h2>
        <p className="mb-3 text-body text-ink-soft">Apagá lo que no usen: desaparece de la barra, de “Más” y de los accesos de Hoy.</p>
        <ul className="flex flex-col divide-y divide-line">
          {MODULES.map((m) => {
            const on = isModuleEnabled(household.settings, m.key);
            return (
              <li key={m.key} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: m.color }}>
                  <m.icon size={16} />
                </span>
                <span className="flex-1">
                  <span className="block text-item font-semibold text-ink">{m.label}</span>
                  <span className="block text-meta text-ink-faint">{m.core ? "Siempre activo" : m.desc}</span>
                </span>
                <Switch checked={on} disabled={m.core || pending} label={m.label} onChange={(v) => act(() => setModuleEnabled(m.key, v))} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Inspiración */}
      <section className="lb-card">
        <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
          <BookHeart size={16} /> Inspiración de Hoy
        </h2>
        <p className="mb-3 text-body text-ink-soft">Qué lectura ven cada mañana (o ninguna) y si quieren horóscopo.</p>
        <InspirationSetup
          compact
          current={traditionOf(household.settings)}
          horoscope={household.settings.inspiration?.horoscope !== false}
          otherLabel={household.settings.inspiration?.otherLabel ?? null}
        />
      </section>

      <div id="avisos" className="scroll-mt-4">
        <PushSetup />
      </div>

      {isAdmin && (
        <Link href="/admin" className="lb-card flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
            <ShieldCheck size={18} />
          </span>
          <span className="flex-1">
            <span className="block font-display text-item font-semibold text-ink">Panel de admin</span>
            <span className="block text-meta text-ink-faint">Hogares, usuarios, instalaciones y uso.</span>
          </span>
          <ChevronRight size={16} className="text-ink-ghost" />
        </Link>
      )}

      <div id="huella" className="scroll-mt-4">
        <PasskeysSection passkeys={passkeys} />
      </div>

      <AndroidAppCard />

      <CalendarSubscribe />

      {/* Cuenta */}
      <section className="lb-card">
        <p className="text-meta text-ink-faint">Sesión iniciada como {email}</p>
        <button
          type="button"
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.href = "/";
          }}
          className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold text-danger"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </section>
    </div>
  );
}
