"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { todayAR, TZ } from "@/lib/format";
import { saveFamilyEvent } from "@/app/actions/familyEvents";
import {
  sanitize,
  EVENT_CATEGORIES,
  EXPENSE_KEYS,
  MEAL_SLOTS,
  REMINDER_CATEGORIES,
  SHOPPING_CATEGORIES,
  TRANSPORTS,
  type Plan,
  type PlanItem,
  type PlanKind,
} from "@/lib/assistant";

// El plan se arma en /api/contale (en streaming); acá solo se aplica lo que la persona aprobó:
// crear lo nuevo, cambiar lo que ya estaba y cancelar lo que no va más.

export type ApplyResult =
  | { ok: true; created: Partial<Record<PlanKind, number>>; changed: number; cancelled: number }
  | { ok: false; error: string };

type Row = Record<string, unknown> & { id: string };

const TABLE: Record<PlanKind, string> = {
  evento: "calendar_events",
  viaje: "logistics_trips",
  tarea: "daily_tasks",
  compra: "shopping_items",
  recordatorio: "reminders",
  comida: "meal_plans",
  evento_familiar: "family_events",
  presupuesto: "budgets",
};

const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T =>
  value && (list as readonly string[]).includes(value) ? (value as T) : fallback;
const valid = <T extends string>(list: readonly T[], value: string | null): T | null =>
  value && (list as readonly string[]).includes(value) ? (value as T) : null;

const toIso = (date: string, time: string | null) => `${date}T${time ?? "00:00"}:00-03:00`;
const localDateTime = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: TZ }); // "2026-09-28 16:00:00"

// Solo lo que cambia: lo que vino null queda como estaba.
function patchFor(i: PlanItem, cur: Row): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== null && value !== undefined && value !== "" && value !== cur[key]) p[key] = value;
  };
  switch (i.kind) {
    case "evento": {
      set("title", i.title);
      if (i.date || i.time || i.end_time) {
        const local = localDateTime(String(cur.starts_at));
        const oldDate = local.slice(0, 10);
        const oldTime = cur.all_day ? null : local.slice(11, 16);
        const date = i.date ?? oldDate;
        const time = i.time ?? oldTime;
        const starts = toIso(date, time);
        p.starts_at = starts;
        p.all_day = !time;
        if (i.end_time && time) p.ends_at = toIso(date, i.end_time);
        else if (cur.ends_at) {
          // Si se movió el comienzo, el final se corre lo mismo (misma duración).
          const duration = Date.parse(String(cur.ends_at)) - Date.parse(String(cur.starts_at));
          p.ends_at = new Date(Date.parse(starts) + Math.max(0, duration)).toISOString();
        }
      }
      set("location", i.place);
      set("notes", i.notes);
      set("member_id", i.member_id);
      set("category", valid(EVENT_CATEGORIES, i.category));
      break;
    }
    case "viaje":
      set("trip_date", i.date);
      set("departure_time", i.time);
      set("arrival_time", i.end_time);
      set("driver_id", i.driver_id);
      set("member_id", i.member_id);
      set("origin", i.origin);
      set("destination", i.place);
      set("transport", valid(TRANSPORTS, i.transport));
      set("notes", i.notes);
      break;
    case "tarea":
      set("title", i.title);
      set("due_date", i.date);
      set("assigned_to", i.member_id);
      set("notes", i.notes);
      break;
    case "compra":
      set("name", i.title);
      set("quantity", i.quantity);
      set("category", valid(SHOPPING_CATEGORIES, i.category));
      break;
    case "recordatorio":
      set("title", i.title);
      set("due_date", i.date);
      set("amount", i.amount);
      set("member_id", i.member_id);
      set("category", valid(REMINDER_CATEGORIES, i.category));
      set("notes", i.notes);
      break;
    case "comida":
      set("title", i.title);
      set("day", i.date);
      set("slot", valid(MEAL_SLOTS, i.category));
      set("notes", i.notes);
      break;
    case "presupuesto":
      set("monthly_limit", i.amount);
      break;
    case "evento_familiar":
      break; // va por saveFamilyEvent (mantiene sincronizada su copia en el calendario)
  }
  return p;
}

// Aplica lo que la persona dejó tildado. Se vuelve a validar todo acá: lo que llega del
// navegador pudo haberse editado. Los cambios y bajas solo alcanzan filas del propio hogar (RLS).
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
  if (!items.length) return { ok: false, error: "No hay nada tildado." };

  const supabase = await createClient();
  const errors: string[] = [];

  // ── Crear ──
  const creates = items.filter((i) => i.action === "crear");
  const by = (kind: PlanKind) => creates.filter((i) => i.kind === kind);
  const day = (i: PlanItem) => i.date ?? today;
  const inserts: [string, Record<string, unknown>[]][] = [
    [
      "calendar_events",
      by("evento").map((i) => ({
        title: i.title,
        category: pick(EVENT_CATEGORIES, i.category, "familia"),
        member_id: i.member_id,
        starts_at: toIso(day(i), i.time),
        ends_at: i.time && i.end_time ? toIso(day(i), i.end_time) : null,
        all_day: !i.time,
        location: i.place,
        notes: i.notes,
      })),
    ],
    [
      "logistics_trips",
      by("viaje").map((i) => ({
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
      })),
    ],
    [
      "daily_tasks",
      by("tarea").map((i) => ({
        title: i.title,
        assigned_to: i.member_id,
        due_date: day(i),
        notes: [i.time ? `a las ${i.time}` : null, i.notes].filter(Boolean).join(" · ") || null,
        points: 0,
      })),
    ],
    [
      "shopping_items",
      by("compra").map((i) => ({ name: i.title, quantity: i.quantity, category: pick(SHOPPING_CATEGORIES, i.category, "otro"), added_by: me?.id ?? null })),
    ],
    [
      "reminders",
      by("recordatorio").map((i) => ({
        title: i.title,
        due_date: day(i),
        category: pick(REMINDER_CATEGORIES, i.category, "otro"),
        amount: i.amount,
        member_id: i.member_id,
        notify_days_before: 1,
        repeat: "none",
        notes: i.notes,
      })),
    ],
    ["meal_plans", by("comida").map((i) => ({ day: day(i), slot: pick(MEAL_SLOTS, i.category, "cena"), title: i.title, notes: i.notes }))],
  ];
  const insertResults = await Promise.all(inserts.filter(([, rows]) => rows.length).map(([table, rows]) => supabase.from(table).insert(rows)));
  for (const r of insertResults) if (r.error) errors.push(r.error.message);

  // Topes nuevos: si esa categoría ya tenía uno, se actualiza (uno por categoría y hogar).
  const newBudgets = by("presupuesto").filter((i) => i.amount && valid(EXPENSE_KEYS, i.category));
  if (newBudgets.length) {
    const { error } = await supabase
      .from("budgets")
      .upsert(newBudgets.map((i) => ({ household_id: household.id, category: i.category, monthly_limit: i.amount })), { onConflict: "household_id,category" });
    if (error) errors.push(error.message);
  }

  // ── Modificar ──
  const changes = items.filter((i) => i.action === "modificar" && i.target);
  let changed = 0;
  const kinds = [...new Set(changes.map((i) => i.kind))];
  await Promise.all(
    kinds.map(async (kind) => {
      const list = changes.filter((i) => i.kind === kind);
      const { data, error } = await supabase.from(TABLE[kind]).select("*").in("id", list.map((i) => i.target!.id));
      if (error) return void errors.push(error.message);
      const current = new Map(((data ?? []) as Row[]).map((r) => [r.id, r]));
      for (const i of list) {
        const cur = current.get(i.target!.id);
        if (!cur) {
          errors.push("Algo que querías cambiar ya no existe.");
          continue;
        }
        if (kind === "evento_familiar") {
          try {
            await saveFamilyEvent({
              id: cur.id,
              title: i.title || String(cur.title),
              event_date: i.date ?? String(cur.event_date),
              event_time: i.time ?? ((cur.event_time as string | null) ?? null),
              location: i.place ?? ((cur.location as string | null) ?? null),
              guests: i.guests ?? Number(cur.guests ?? 0),
              budget: i.amount ?? ((cur.budget as number | null) ?? null),
              notes: i.notes ?? ((cur.notes as string | null) ?? null),
            });
            changed++;
          } catch (e) {
            errors.push(e instanceof Error ? e.message : "No se pudo cambiar el evento.");
          }
          continue;
        }
        const patch = patchFor(i, cur);
        if (!Object.keys(patch).length) continue;
        const { error: upErr } = await supabase.from(TABLE[kind]).update(patch).eq("id", cur.id);
        if (upErr) errors.push(upErr.message);
        else changed++;
      }
    })
  );

  // ── Cancelar ── (los eventos familiares no se borran desde acá: sanitize ya los descartó)
  const cancels = items.filter((i) => i.action === "cancelar" && i.target && i.kind !== "evento_familiar");
  let cancelled = 0;
  await Promise.all(
    [...new Set(cancels.map((i) => i.kind))].map(async (kind) => {
      const ids = cancels.filter((i) => i.kind === kind).map((i) => i.target!.id);
      const { data, error } = await supabase.from(TABLE[kind]).delete().in("id", ids).select("id");
      if (error) errors.push(error.message);
      else cancelled += data?.length ?? 0;
    })
  );

  for (const path of ["/", "/calendario", "/logistica", "/compras", "/vencimientos", "/menu", "/puntos", "/eventos", "/finanzas"]) revalidatePath(path);

  const created: Partial<Record<PlanKind, number>> = {};
  for (const i of creates) created[i.kind] = (created[i.kind] ?? 0) + 1;

  if (errors.length) {
    console.error("[assistant] apply failed:", errors.join(" | "));
    return { ok: false, error: "Se aplicó una parte pero algo falló. Revisá las pantallas y probá de nuevo con lo que falte." };
  }
  return { ok: true, created, changed, cancelled };
}
