import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isModuleEnabled } from "@/lib/modules";
import { upcomingDates } from "@/lib/dates";
import { addDays, formatARS, monthRange, shortTime, todayAR, TZ } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/labels";
import type { Contact, HouseholdSettings, ImportantDate, Member } from "@/lib/types";

// Las alertas de la campanita: lo mismo que avisan las notificaciones (vencimientos, cumples,
// traslados, topes) más lo atrasado, calculado en el momento. Sirven aunque el celu no reciba
// notificaciones (la app de Android, o quien no las activó).

export type AlertLevel = "urgente" | "pronto" | "info";
export type AlertKind = "vence" | "cumple" | "traslado" | "tope" | "tarea" | "evento";
export type Alert = { id: string; level: AlertLevel; kind: AlertKind; title: string; body: string | null; href: string };

const LEVEL_ORDER: Record<AlertLevel, number> = { urgente: 0, pronto: 1, info: 2 };
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function nowMinutesAR(): number {
  const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
  return h * 60 + m;
}

// Con el cliente del usuario: RLS ya deja solo lo de su hogar.
export async function computeAlerts(supabase: SupabaseClient, settings: HouseholdSettings | null | undefined, members: Member[]): Promise<Alert[]> {
  const on = (key: string) => isModuleEnabled(settings, key);
  const today = todayAR();
  const { from, to } = monthRange(today);
  const none = Promise.resolve({ data: null });
  const [remRes, datesRes, contactsRes, tripsRes, budgetsRes, expensesRes, tasksRes, famRes] = await Promise.all([
    on("vencimientos") ? supabase.from("reminders").select("id, title, due_date, amount, notify_days_before").eq("done", false).lte("due_date", addDays(today, 30)) : none,
    supabase.from("important_dates").select("*"),
    on("circulo") ? supabase.from("contacts").select("*").is("archived_at", null) : none,
    on("logistica") ? supabase.from("logistics_trips").select("id, departure_time, destination, member_id, driver_id").eq("trip_date", today).eq("done", false) : none,
    supabase.from("budgets").select("category, monthly_limit"),
    supabase.from("expenses").select("category, amount").gte("spent_at", from).lte("spent_at", to).eq("is_draft", false),
    supabase.from("daily_tasks").select("id, title, due_date").eq("done", false).lt("due_date", today),
    on("eventos") ? supabase.from("family_events").select("id, title, event_date, event_time").eq("status", "planning").gte("event_date", today).lte("event_date", addDays(today, 3)) : none,
  ]);
  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? null;
  const alerts: Alert[] = [];

  for (const r of (remRes.data ?? []) as { id: string; title: string; due_date: string; amount: number | null; notify_days_before: number }[]) {
    const d = days(today, r.due_date);
    if (d > Math.max(r.notify_days_before, 0)) continue;
    alerts.push({
      id: `vence:${r.id}:${today}`,
      level: d <= 0 ? "urgente" : "pronto",
      kind: "vence",
      title: d < 0 ? `${r.title}: venció hace ${-d} ${plural(-d, "día", "días")}` : d === 0 ? `${r.title} vence hoy` : `${r.title} vence en ${d} ${plural(d, "día", "días")}`,
      body: r.amount ? formatARS(Number(r.amount)) : null,
      href: "/vencimientos",
    });
  }

  const upcoming = upcomingDates(today, (datesRes.data ?? []) as ImportantDate[], members, (contactsRes.data ?? []) as Contact[]);
  for (const u of upcoming) {
    if (u.daysUntil > Math.min(u.remind_days_before, 7)) continue;
    const turns = u.turns != null && u.kind !== "otro" ? (u.kind === "cumple" ? `Cumple ${u.turns} años` : `${u.turns} años juntos`) : null;
    alerts.push({
      id: `fecha:${u.id}:${u.next}:${today}`,
      level: u.daysUntil === 0 ? "pronto" : "info",
      kind: "cumple",
      title: u.daysUntil === 0 ? `¡Hoy: ${u.title}! 🎉` : `${u.title} en ${u.daysUntil} ${plural(u.daysUntil, "día", "días")}`,
      body: [turns, u.gift_ideas ? `Ideas de regalo: ${u.gift_ideas}` : null].filter(Boolean).join(" · ") || null,
      href: "/calendario?tab=fechas",
    });
  }

  const now = nowMinutesAR();
  for (const t of (tripsRes.data ?? []) as { id: string; departure_time: string | null; destination: string; member_id: string | null; driver_id: string | null }[]) {
    if (!t.departure_time) continue;
    const diff = Number(t.departure_time.slice(0, 2)) * 60 + Number(t.departure_time.slice(3, 5)) - now;
    if (diff < -15 || diff > 120) continue;
    const who = name(t.member_id);
    alerts.push({
      id: `traslado:${t.id}:${today}`,
      level: diff <= 30 ? "urgente" : "pronto",
      kind: "traslado",
      title: diff <= 0 ? `Ya tenía que salir: ${who ? `${who} → ` : ""}${t.destination}` : `Sale en ${diff < 60 ? `${diff} min` : `${Math.round(diff / 60)} h`}: ${who ? `${who} → ` : ""}${t.destination}`,
      body: `A las ${shortTime(t.departure_time)}${name(t.driver_id) ? ` · lleva ${name(t.driver_id)}` : ""}`,
      href: "/logistica",
    });
  }

  if (on("finanzas")) {
    const spent = new Map<string, number>();
    for (const e of (expensesRes.data ?? []) as { category: string; amount: number }[]) spent.set(e.category, (spent.get(e.category) ?? 0) + Number(e.amount));
    for (const b of (budgetsRes.data ?? []) as { category: string; monthly_limit: number }[]) {
      const pct = Math.round(((spent.get(b.category) ?? 0) / Number(b.monthly_limit)) * 100);
      if (pct < 90) continue;
      const label = EXPENSE_CATEGORIES[b.category as keyof typeof EXPENSE_CATEGORIES] ?? b.category;
      alerts.push({
        id: `tope:${b.category}:${from}:${pct >= 100 ? "over" : "near"}`,
        level: pct >= 100 ? "urgente" : "pronto",
        kind: "tope",
        title: pct >= 100 ? `Se pasaron del tope en ${label}` : `${label}: ya van ${pct}% del tope`,
        body: `${formatARS(spent.get(b.category) ?? 0)} de ${formatARS(Number(b.monthly_limit))} este mes`,
        href: "/finanzas",
      });
    }
  }

  const late = (tasksRes.data ?? []) as { id: string; title: string; due_date: string }[];
  if (late.length) {
    alerts.push({
      id: `tareas:${late.length}:${today}`,
      level: "info",
      kind: "tarea",
      title: late.length === 1 ? `Quedó pendiente: ${late[0].title}` : `${late.length} tareas quedaron pendientes`,
      body: late.length > 1 ? late.slice(0, 3).map((t) => t.title).join(" · ") : null,
      href: "/",
    });
  }

  for (const f of (famRes.data ?? []) as { id: string; title: string; event_date: string; event_time: string | null }[]) {
    const d = days(today, f.event_date);
    alerts.push({
      id: `evento:${f.id}:${today}`,
      level: d === 0 ? "pronto" : "info",
      kind: "evento",
      title: d === 0 ? `Hoy: ${f.title} 🎉` : `${f.title} en ${d} ${plural(d, "día", "días")}`,
      body: f.event_time ? `A las ${shortTime(f.event_time)}` : null,
      href: `/eventos/${f.id}`,
    });
  }

  return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
