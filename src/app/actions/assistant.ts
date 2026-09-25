"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { todayAR } from "@/lib/format";
import {
  sanitize,
  EVENT_CATEGORIES,
  MEAL_SLOTS,
  REMINDER_CATEGORIES,
  SHOPPING_CATEGORIES,
  TRANSPORTS,
  type Plan,
  type PlanItem,
} from "@/lib/assistant";

// El plan se arma en /api/contale (en streaming); acá solo se carga lo que la persona aprobó.

export type ApplyResult =
  | { ok: true; counts: Partial<Record<PlanItem["kind"], number>> }
  | { ok: false; error: string };

const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T =>
  value && (list as readonly string[]).includes(value) ? (value as T) : fallback;

const toIso = (date: string, time: string | null) => `${date}T${time ?? "00:00"}:00-03:00`;

// Carga lo que la persona dejó tildado. Se vuelve a validar todo acá: lo que llega del
// navegador pudo haberse editado.
export async function applyPlan(rawItems: PlanItem[]): Promise<ApplyResult> {
  const { user, members, me, household } = await getSessionContext();
  if (!user || !household) return { ok: false, error: "Tenés que iniciar sesión." };

  const on = (key: string) => isModuleEnabled(household.settings, key);
  const today = todayAR();
  const { items } = sanitize({ summary: "", questions: [], items: rawItems } as Plan, {
    today,
    members,
    enabled: { logistica: on("logistica"), compras: on("compras"), vencimientos: on("vencimientos"), menu: on("menu") },
  });
  if (!items.length) return { ok: false, error: "No hay nada tildado para cargar." };

  const by = (kind: PlanItem["kind"]) => items.filter((i) => i.kind === kind);
  const day = (i: PlanItem) => i.date ?? today;

  const events = by("evento").map((i) => ({
    title: i.title,
    category: pick(EVENT_CATEGORIES, i.category, "familia"),
    member_id: i.member_id,
    starts_at: toIso(day(i), i.time),
    ends_at: i.time && i.end_time ? toIso(day(i), i.end_time) : null,
    all_day: !i.time,
    location: i.place,
    notes: i.notes,
  }));
  const trips = by("viaje").map((i) => ({
    trip_date: day(i),
    member_id: i.member_id,
    driver_id: i.driver_id,
    origin: i.origin,
    destination: i.place || i.title,
    departure_time: i.time,
    arrival_time: i.end_time,
    transport: pick(TRANSPORTS, i.transport, "auto"),
    meet_with: null,
    notes: [i.title, i.notes].filter(Boolean).join(" · ") || null,
  }));
  const tasks = by("tarea").map((i) => ({
    title: i.title,
    assigned_to: i.member_id,
    due_date: day(i),
    notes: [i.time ? `a las ${i.time}` : null, i.notes].filter(Boolean).join(" · ") || null,
    points: 0,
  }));
  const shopping = by("compra").map((i) => ({
    name: i.title,
    quantity: i.quantity,
    category: pick(SHOPPING_CATEGORIES, i.category, "otro"),
    added_by: me?.id ?? null,
  }));
  const reminders = by("recordatorio").map((i) => ({
    title: i.title,
    due_date: day(i),
    category: pick(REMINDER_CATEGORIES, i.category, "otro"),
    amount: i.amount,
    member_id: i.member_id,
    notify_days_before: 1,
    repeat: "none",
    notes: i.notes,
  }));
  const meals = by("comida").map((i) => ({
    day: day(i),
    slot: pick(MEAL_SLOTS, i.category, "cena"),
    title: i.title,
    notes: i.notes,
  }));

  const supabase = await createClient();
  const inserts: [string, Record<string, unknown>[]][] = [
    ["calendar_events", events],
    ["logistics_trips", trips],
    ["daily_tasks", tasks],
    ["shopping_items", shopping],
    ["reminders", reminders],
    ["meal_plans", meals],
  ];
  const results = await Promise.all(inserts.filter(([, rows]) => rows.length).map(([table, rows]) => supabase.from(table).insert(rows)));
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[assistant] apply failed:", failed.error.message);
    return { ok: false, error: "Se cargó una parte pero algo falló. Revisá el calendario y probá de nuevo con lo que falte." };
  }

  for (const path of ["/", "/calendario", "/logistica", "/compras", "/vencimientos", "/menu", "/puntos"]) revalidatePath(path);
  const counts: Partial<Record<PlanItem["kind"], number>> = {};
  for (const i of items) counts[i.kind] = (counts[i.kind] ?? 0) + 1;
  return { ok: true, counts };
}
