"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BellRing, CalendarHeart, CarFront, ClipboardList, Gift, PartyPopper, PiggyBank, type LucideIcon } from "lucide-react";
import type { Alert, AlertKind } from "@/lib/alerts";
import { BottomSheet } from "@/components/ui/BottomSheet";

const SEEN_KEY = "lb-alerts-seen";
const REFRESH_MS = 5 * 60_000;
const ICON: Record<AlertKind, LucideIcon> = { vence: BellRing, cumple: Gift, traslado: CarFront, tope: PiggyBank, tarea: ClipboardList, evento: PartyPopper };
const GROUPS = [
  { level: "urgente", label: "Ahora", color: "var(--text-danger)" },
  { level: "pronto", label: "Pronto", color: "var(--text-amber)" },
  { level: "info", label: "Para tener en cuenta", color: "var(--text-info)" },
] as const;

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

// La campanita de arriba: vencimientos, cumples, traslados que están por salir, topes y lo
// atrasado. El número cuenta lo que todavía no viste en este celu.
export function AlertsBell() {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alertas", { cache: "no-store" });
      if (res.ok) setAlerts(((await res.json()) as { alerts: Alert[] }).alerts);
    } catch {}
  }, []);

  useEffect(() => {
    setSeen(readSeen());
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Al cambiar de pantalla (por ejemplo, después de pagar algo) se recalcula.
  useEffect(() => {
    load();
  }, [pathname, load]);

  const unseen = alerts.filter((a) => !seen.has(a.id)).length;

  function show() {
    setOpen(true);
    const ids = alerts.map((a) => a.id);
    setSeen(new Set(ids));
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); // solo las vigentes: la lista no crece
    } catch {}
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={unseen ? `Alertas: ${unseen} nuevas` : "Alertas"}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink-ghost"
      >
        {unseen ? <BellRing size={18} className="text-coral" /> : <Bell size={18} />}
        {unseen > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Alertas">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CalendarHeart size={28} className="text-success" />
            <p className="font-accent text-2xl text-ink-faint">Todo tranquilo por ahora.</p>
            <p className="text-meta text-ink-faint">Acá aparecen vencimientos, cumples, traslados por salir y topes.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {GROUPS.map((g) => {
              const list = alerts.filter((a) => a.level === g.level);
              if (!list.length) return null;
              return (
                <section key={g.level} className="flex flex-col gap-2">
                  <h3 className="text-label font-bold uppercase tracking-wider" style={{ color: g.color }}>
                    {g.label}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {list.map((a) => {
                      const Icon = ICON[a.kind];
                      return (
                        <li key={a.id}>
                          <Link href={a.href} onClick={() => setOpen(false)} className="lb-card flex items-center gap-3 !p-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line/60" style={{ color: g.color }}>
                              <Icon size={17} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-item font-medium text-ink">{a.title}</span>
                              {a.body && <span className="block text-meta text-ink-faint">{a.body}</span>}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
