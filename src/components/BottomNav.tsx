"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, CarFront, ListChecks, PiggyBank, Sparkles } from "lucide-react";

const items = [
  { href: "/", label: "Hoy", icon: Sparkles },
  { href: "/calendario", label: "Calendario", icon: CalendarHeart },
  { href: "/logistica", label: "Logística", icon: CarFront },
  { href: "/finanzas", label: "Finanzas", icon: PiggyBank },
  { href: "/proyectos", label: "Metas", icon: ListChecks },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-rose-100 bg-white/90 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-between px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-xs transition-colors ${
                  active ? "text-rose-600" : "text-slate-400"
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
