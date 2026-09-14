"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, CarFront, ListChecks, PiggyBank, Sparkles } from "lucide-react";

const items = [
  { href: "/", label: "Hoy", icon: Sparkles, color: "var(--color-amber)" },
  { href: "/calendario", label: "Calendario", icon: CalendarHeart, color: "var(--color-info)" },
  { href: "/logistica", label: "Logística", icon: CarFront, color: "var(--color-success)" },
  { href: "/finanzas", label: "Finanzas", icon: PiggyBank, color: "var(--color-ariana)" },
  { href: "/proyectos", label: "Metas", icon: ListChecks, color: "var(--color-jaz)" },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="lb-nav z-10">
      <ul className="mx-auto flex max-w-md justify-between px-2">
        {items.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                style={{ color: active ? color : undefined }}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-xs transition-colors ${
                  active ? "" : "text-ink-ghost"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
