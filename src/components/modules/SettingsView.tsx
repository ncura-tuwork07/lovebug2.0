"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookHeart, Check, ChevronRight, Copy, LogOut, RefreshCw, Share2, ShieldCheck, Sparkle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { regenerateInviteCode, setInspirationSetting, setModuleEnabled, updateHouseholdName } from "@/app/actions/household";
import { MODULES, isModuleEnabled } from "@/lib/modules";
import { inviteLink } from "@/lib/app";
import type { Household, Member } from "@/lib/types";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { PushSetup } from "@/components/PushSetup";

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${checked ? "bg-coral" : "bg-track"}`}
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
}: {
  household: Household;
  members: Member[];
  me: Member;
  email: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(household.name);
  const [code, setCode] = useState(household.invite_code);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  // Siempre el link público, aunque estemos probando en localhost.
  const link = inviteLink(code);
  const shareText = `Te invito a nuestro hogar “${household.name}” en Lovebug 🐞, la app para organizarnos entre todos. Entrá con este link: ${link}`;

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

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No pudimos copiar. Seleccioná el link y copialo a mano.");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Lovebug", text: shareText });
      } catch {
        /* el usuario canceló */
      }
    } else {
      await copy();
    }
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
        <Link href="/familia" className="mt-3 inline-block text-sm font-semibold text-coral">
          Agregar integrantes →
        </Link>
      </section>

      {/* Invitación */}
      <section className="lb-card">
        <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-success">
          <Share2 size={16} /> Invitar a alguien
        </h2>
        <p className="mb-3 text-body text-ink-soft">
          Quien entre con este link se suma al hogar y ve todo lo mismo que vos: pareja, familia, amigos o compañeros de casa. Compartilo solo con quien quieras adentro.
        </p>
        <div className="rounded-md bg-field px-3 py-2">
          <p className="text-label font-bold uppercase tracking-wider text-ink-ghost">Código</p>
          <p className="font-display text-2xl font-bold tracking-[0.25em] text-ink">{code}</p>
          <p className="mt-1 break-all text-meta text-ink-faint">{link}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={share} className="lb-btn flex items-center gap-2 !px-4">
            <Share2 size={16} /> Compartir
          </button>
          <button type="button" onClick={copy} className="flex min-h-11 items-center gap-2 rounded-md border-[1.5px] border-line px-4 text-sm font-semibold text-ink">
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar link"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("¿Renovar el código? El link anterior deja de funcionar.")) return;
              act(async () => setCode(await regenerateInviteCode()));
            }}
            className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-ink-faint disabled:opacity-50"
          >
            <RefreshCw size={16} /> Renovar
          </button>
        </div>
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
        <ul className="flex flex-col divide-y divide-line">
          <li className="flex items-center gap-3 py-2.5">
            <span className="flex-1">
              <span className="block text-item font-semibold text-ink">Evangelio y oración del día</span>
              <span className="block text-meta text-ink-faint">Lecturas católicas según el calendario litúrgico.</span>
            </span>
            <Switch
              checked={household.settings.inspiration?.gospel !== false}
              disabled={pending}
              label="Evangelio"
              onChange={(v) => act(() => setInspirationSetting("gospel", v))}
            />
          </li>
          <li className="flex items-center gap-3 py-2.5">
            <span className="flex-1">
              <span className="block text-item font-semibold text-ink">Horóscopo</span>
              <span className="block text-meta text-ink-faint">Según la fecha de nacimiento de cada adulto del hogar.</span>
            </span>
            <Switch
              checked={household.settings.inspiration?.horoscope !== false}
              disabled={pending}
              label="Horóscopo"
              onChange={(v) => act(() => setInspirationSetting("horoscope", v))}
            />
          </li>
        </ul>
      </section>

      <PushSetup />

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
