"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { Logo } from "@/components/Logo";

export function Header() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (pathname === "/login") return null;

  return (
    <div className="flex items-center justify-between px-4 pt-4">
      <Link href="/" className="flex items-center gap-1.5 font-display text-lg font-bold">
        <Logo size={22} />
        <span>
          <span className="text-ink">Love</span>
          <span className="text-coral">bug</span>
        </span>
      </Link>
      {email && (
        <div className="flex items-center gap-1">
          <Link
            href="/familia"
            aria-label="Familia"
            className={`flex h-11 w-11 items-center justify-center rounded-full ${
              pathname === "/familia" ? "text-coral" : "text-ink-ghost"
            }`}
          >
            <Users size={18} />
          </Link>
          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={async () => {
              await createClient().auth.signOut();
              window.location.href = "/login";
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-ghost"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
