"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarHeart, CarFront, LayoutGrid, PiggyBank, Sparkles } from "lucide-react";
import { useHousehold } from "@/components/HouseholdProvider";
import { isModuleEnabled } from "@/lib/modules";

const items = [
  { href: "/", label: "Hoy", icon: Sparkles, color: "var(--color-amber)", key: null },
  { href: "/calendario", label: "Calendario", icon: CalendarHeart, color: "var(--color-info)", key: "calendario" },
  { href: "/logistica", label: "Logística", icon: CarFront, color: "var(--color-success)", key: "logistica" },
  { href: "/finanzas", label: "Finanzas", icon: PiggyBank, color: "var(--color-ariana)", key: "finanzas" },
  { href: "/mas", label: "Más", icon: LayoutGrid, color: "var(--color-coral)", key: null },
];

const TOP_LEVEL = ["/", "/calendario", "/logistica", "/finanzas"];

export function BottomNav() {
  const pathname = usePathname();
  const { household } = useHousehold();
  const visible = items.filter((i) => !i.key || isModuleEnabled(household?.settings, i.key));

  return (
    <nav className="lb-nav z-10">
      <ul className="mx-auto flex max-w-md justify-between px-2">
        {visible.map(({ href, label, icon: Icon, color }) => {
          // "Más" queda activo en cualquier pantalla que no tenga su propia pestaña.
          const active = href === "/mas" ? !TOP_LEVEL.includes(pathname) : pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                style={active ? ({ "--tint": color } as CSSProperties) : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-xs transition-colors ${
                  active ? "lb-tint" : "text-ink-ghost"
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
