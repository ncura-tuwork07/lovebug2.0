"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Mic, Settings, Users } from "lucide-react";
import { useContale } from "@/components/assistant/Contale";
import { clearProfile } from "@/app/actions/session";
import { useHousehold } from "@/components/HouseholdProvider";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { me, members } = useHousehold();
  const [pending, start] = useTransition();
  const contale = useContale();

  return (
    <div className="flex items-center justify-between px-4 pt-4">
      <Link href="/" className="flex items-center gap-1.5 font-display text-lg font-bold">
        <Logo size={22} />
        <span>
          <span className="text-ink">Love</span>
          <span className="text-coral">bug</span>
        </span>
      </Link>
      <div className="flex items-center">
        {/* Micrófono global: desde cualquier pantalla, contale a Lovebug lo que pasa. */}
        {contale && (
          <button
            type="button"
            aria-label="Contale a Lovebug"
            onClick={() => contale({ listen: true })}
            className="flex h-11 w-11 items-center justify-center rounded-full text-coral active:bg-coral-soft"
          >
            <Mic size={19} />
          </button>
        )}
        <ThemeToggle />
        <Link
          href="/familia"
          aria-label="Familia"
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            pathname.startsWith("/familia") ? "text-coral" : "text-ink-ghost"
          }`}
        >
          <Users size={18} />
        </Link>
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            pathname.startsWith("/ajustes") || pathname.startsWith("/admin") ? "text-coral" : "text-ink-ghost"
          }`}
        >
          <Settings size={18} />
        </Link>
        {/* Con más de un perfil en el hogar, tocar el avatar deja elegir otro (sin cerrar sesión). */}
        {members.length > 1 && (
          <button
            type="button"
            aria-label="Cambiar de perfil"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await clearProfile();
                router.push("/perfil");
              })
            }
            className="flex h-11 w-11 items-center justify-center disabled:opacity-50"
          >
            <MemberAvatar member={me} size={32} />
          </button>
        )}
      </div>
    </div>
  );
}
