"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between px-4 pt-4">
      <Link href="/" className="flex items-center gap-1.5 font-display text-lg font-bold">
        <Logo size={22} />
        <span>
          <span className="text-ink">Love</span>
          <span className="text-coral">bug</span>
        </span>
      </Link>
      <div className="flex items-center gap-1">
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
      </div>
    </div>
  );
}
