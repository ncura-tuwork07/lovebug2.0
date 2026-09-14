"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, CarFront, ListChecks, PiggyBank, Sparkles } from "lucide-react";

const items = [
  { href: "/", label: "Hoy", icon: Sparkles, color: "var(--brand-secondary)" },
  { href: "/calendario", label: "Calendario", icon: CalendarHeart, color: "var(--brand-info)" },
  { href: "/logistica", label: "Logística", icon: CarFront, color: "var(--brand-success)" },
  { href: "/finanzas", label: "Finanzas", icon: PiggyBank, color: "var(--brand-primary)" },
  { href: "/proyectos", label: "Metas", icon: ListChecks, color: "var(--brand-secondary)" },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-surface bg-white/90 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-between px-2 py-2">
        {items.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                style={{ color: active ? color : undefined }}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-xs transition-colors ${
                  active ? "" : "text-ink/40"
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
