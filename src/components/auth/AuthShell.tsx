import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { ROLE_SUGGESTIONS } from "@/lib/roles";

// Fondo oscuro fijo (no cambia con el tema) para login, registro e invitaciones.
export function AuthShell({ title, subtitle, children, footer }: { title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-[#1E293B] px-6 py-10">
      <Link href="/" className="text-center">
        <Logo size={56} variant="dark" className="mx-auto" />
        <h1 className="mt-2 font-display text-2xl font-bold">
          <span className="text-white">Love</span>
          <span className="text-coral">bug</span>
        </h1>
        {!title && <p className="font-accent text-2xl text-white/60">La familia, siempre en foco.</p>}
      </Link>
      {title && (
        <div className="-mt-3 text-center">
          <h2 className="font-display text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        </div>
      )}
      <div className="w-full max-w-xs">{children}</div>
      {footer && <div className="flex flex-col items-center gap-2 text-sm text-white/60">{footer}</div>}
    </div>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`lb-input ${props.className ?? ""}`} />;
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-white underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function RoleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <AuthInput list="lb-roles" placeholder="Tu rol (Mamá, Papá, Pareja, Amigo…)" value={value} onChange={(e) => onChange(e.target.value)} maxLength={30} />
      <datalist id="lb-roles">
        {ROLE_SUGGESTIONS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </>
  );
}
