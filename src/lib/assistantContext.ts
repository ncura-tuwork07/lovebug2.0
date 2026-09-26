import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContacts, getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { addDays, formatARS, formatDay, todayAR, TZ } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/labels";
import type { ExistingItem, PlanContext, PlanKind } from "@/lib/assistant";

// Tope diario por hogar: la IA es gratis para las familias, así que la cuidamos.
const DAILY_LIMIT = 30;
const MAX_CHARS = 5000;
const USAGE_PATH = "ia:contale";

export type Prepared = { ok: true; ctx: PlanContext; logUsage: () => Promise<void> } | { ok: false; error: string };

// Junta lo que Claude necesita saber del hogar (integrantes, Círculo, lo que ya está en el
// calendario, módulos prendidos) y controla el tope diario.
export async function preparePlanContext(text: string): Promise<Prepared> {
  const input = text.trim();
  if (input.length < 8) return { ok: false, error: "Contame un poco más: qué, cuándo y quién." };
  if (input.length > MAX_CHARS) return { ok: false, error: "Es muy largo para una sola vez. Probá en dos partes." };

  const { user, members, me, household } = await getSessionContext();
  if (!user || !household) return { ok: false, error: "Tenés que iniciar sesión." };

  const admin = createAdminClient();
  if (admin) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.id)
      .eq("path", USAGE_PATH)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return { ok: false, error: `Por hoy ya usaron la IA ${DAILY_LIMIT} veces. Mañana se renueva.` };
  }

  const on = (key: string) => isModuleEnabled(household.settings, key);
  const [contacts, existing] = await Promise.all([getContacts().catch(() => []), loadExisting(on)]);

  return {
    ok: true,
    ctx: {
      text: input,
      now: new Date(),
      today: todayAR(),
      householdName: household.name ?? null,
      members,
      me,
      contacts: contacts.map((c) => ({ name: c.name, relationship: c.relationship })),
      existing,
      enabled: { logistica: on("logistica"), compras: on("compras"), vencimientos: on("vencimientos"), menu: on("menu") },
    },
    logUsage: async () => {
      const supabase = await createClient();
      await supabase.from("usage_events").insert({ user_id: user.id, path: USAGE_PATH });
    },
  };
}

const localDateTime = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: TZ }); // "2026-09-28 16:00:00"
const day = (d: string) => formatDay(d, "EEE d/MM");
const clip = (s: string) => (s.length > 150 ? `${s.slice(0, 147)}…` : s);

// Todo lo que el asistente puede cambiar o cancelar, con una referencia corta por cosa. Solo de los
// módulos prendidos, desde ayer hasta unas semanas adelante, con topes para no inflar el pedido.
async function loadExisting(on: (key: string) => boolean): Promise<ExistingItem[]> {
  const supabase = await createClient();
  const today = todayAR();
  const none = Promise.resolve({ data: null });
  const [cal, trips, tasks, shop, rems, meals, fams, budgets] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, starts_at, all_day, location")
      .is("event_id", null) // los de Eventos se cambian como "evento_familiar" (su copia en el calendario se sincroniza sola)
      .gte("starts_at", `${addDays(today, -1)}T00:00:00-03:00`)
      .lt("starts_at", `${addDays(today, 45)}T00:00:00-03:00`)
      .order("starts_at")
      .limit(40),
    on("logistica")
      ? supabase.from("logistics_trips").select("id, trip_date, departure_time, arrival_time, origin, destination, notes").eq("done", false).gte("trip_date", addDays(today, -1)).lte("trip_date", addDays(today, 45)).order("trip_date").limit(25)
      : none,
    supabase.from("daily_tasks").select("id, title, due_date").eq("done", false).gte("due_date", addDays(today, -7)).order("due_date").limit(25),
    on("compras") ? supabase.from("shopping_items").select("id, name, quantity").eq("checked", false).order("created_at", { ascending: false }).limit(40) : none,
    on("vencimientos")
      ? supabase.from("reminders").select("id, title, due_date, amount").eq("done", false).lte("due_date", addDays(today, 90)).order("due_date").limit(25)
      : none,
    on("menu") ? supabase.from("meal_plans").select("id, day, slot, title").gte("day", today).lte("day", addDays(today, 14)).order("day").limit(14) : none,
    on("eventos")
      ? supabase.from("family_events").select("id, title, event_date, event_time, guests, budget").eq("status", "planning").gte("event_date", addDays(today, -1)).order("event_date").limit(10)
      : none,
    on("finanzas") ? supabase.from("budgets").select("id, category, monthly_limit").order("category") : none,
  ]);

  const out: ExistingItem[] = [];
  const add = (prefix: string, kind: PlanKind, rows: { id: string }[] | null, label: (r: never) => string) =>
    (rows ?? []).forEach((r, i) => out.push({ ref: `${prefix}${i + 1}`, kind, id: r.id, label: clip(label(r as never)) }));

  add("C", "evento", cal.data, (e: { title: string; starts_at: string; all_day: boolean; location: string | null }) => {
    const local = localDateTime(e.starts_at);
    return `${day(local.slice(0, 10))} ${e.all_day ? "todo el día" : local.slice(11, 16)} · ${e.title}${e.location ? ` · en ${e.location}` : ""}`;
  });
  add("V", "viaje", trips.data, (t: { trip_date: string; departure_time: string | null; arrival_time: string | null; origin: string | null; destination: string; notes: string | null }) => {
    const when = t.departure_time ? `sale ${t.departure_time.slice(0, 5)}` : t.arrival_time ? `llegar ${t.arrival_time.slice(0, 5)}` : "";
    return `${day(t.trip_date)} ${when} · ${t.origin ? `de ${t.origin} ` : ""}a ${t.destination}${t.notes ? ` · ${t.notes}` : ""}`;
  });
  add("T", "tarea", tasks.data, (t: { title: string; due_date: string }) => `${day(t.due_date)} · ${t.title}`);
  add("S", "compra", shop.data, (s: { name: string; quantity: string | null }) => `${s.name}${s.quantity ? ` (${s.quantity})` : ""}`);
  add("R", "recordatorio", rems.data, (r: { title: string; due_date: string; amount: number | null }) => `vence ${day(r.due_date)} · ${r.title}${r.amount ? ` · ${formatARS(Number(r.amount))}` : ""}`);
  add("M", "comida", meals.data, (m: { day: string; slot: string; title: string }) => `${day(m.day)} ${m.slot} · ${m.title}`);
  add("F", "evento_familiar", fams.data, (f: { title: string; event_date: string; event_time: string | null; guests: number; budget: number | null }) =>
    `${day(f.event_date)}${f.event_time ? ` ${f.event_time.slice(0, 5)}` : ""} · ${f.title} · ${f.guests} invitados${f.budget ? ` · presupuesto ${formatARS(Number(f.budget))}` : ""}`
  );
  add("P", "presupuesto", budgets.data, (b: { category: string; monthly_limit: number }) =>
    `tope mensual de ${EXPENSE_CATEGORIES[b.category as keyof typeof EXPENSE_CATEGORIES] ?? b.category} (${b.category}): ${formatARS(Number(b.monthly_limit))}`
  );
  return out;
}
