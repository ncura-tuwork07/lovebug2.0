"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MenuItem, PantryItem, Recipe } from "@/lib/types";
import { checkPantry, mergeIngredients, scaleIngredients, toShoppingLine } from "@/lib/kitchen";

function revalidate(id?: string) {
  revalidatePath("/eventos");
  if (id) revalidatePath(`/eventos/${id}`);
  revalidatePath("/calendario");
  revalidatePath("/compras");
  revalidatePath("/");
}

export type FamilyEventInput = {
  id?: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  guests: number | string;
  budget: number | string | null;
  notes: string | null;
};

export async function saveFamilyEvent(input: FamilyEventInput): Promise<string> {
  const supabase = await createClient();
  const budget = input.budget === null || input.budget === "" ? null : Number(input.budget);
  const row = {
    title: input.title.trim(),
    event_date: input.event_date,
    event_time: input.event_time || null,
    location: input.location?.trim() || null,
    guests: Math.max(0, Math.round(Number(input.guests) || 0)),
    budget: budget !== null && Number.isFinite(budget) && budget > 0 ? budget : null,
    notes: input.notes?.trim() || null,
  };
  if (!row.title) throw new Error("Falta el nombre del evento.");

  let id = input.id;
  if (id) {
    const { error } = await supabase.from("family_events").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("family_events").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    id = data.id;
  }

  // Mantiene el evento en el calendario (categoría social) sincronizado.
  const starts_at = `${row.event_date}T${row.event_time ?? "00:00"}:00-03:00`;
  const cal = {
    title: row.title,
    category: "social",
    starts_at,
    all_day: !row.event_time,
    location: row.location,
    notes: row.guests ? `${row.guests} invitados` : null,
    event_id: id,
  };
  const { data: existing } = await supabase.from("calendar_events").select("id").eq("event_id", id).maybeSingle();
  if (existing) await supabase.from("calendar_events").update(cal).eq("id", existing.id);
  else await supabase.from("calendar_events").insert(cal);

  revalidate(id);
  return id!;
}

export async function setEventStatus(id: string, status: "planning" | "done") {
  const supabase = await createClient();
  const { error } = await supabase.from("family_events").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(id);
}

export async function deleteFamilyEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("family_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function setEventMenu(id: string, menu: MenuItem[]) {
  const supabase = await createClient();
  const clean = menu.map((m) => ({
    recipe_id: m.recipe_id || null,
    title: m.title.trim(),
    portions: Math.max(1, Math.round(Number(m.portions) || 1)),
  })).filter((m) => m.title);
  const { error } = await supabase.from("family_events").update({ menu: clean }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(id);
}

// Calcula los ingredientes del menú (recetas escaladas), resta la despensa y manda lo que falta a Compras.
export async function sendEventMenuToShopping(id: string, addedBy: string | null): Promise<number> {
  const supabase = await createClient();
  const [{ data: ev }, { data: recipes }, { data: pantry }] = await Promise.all([
    supabase.from("family_events").select("menu").eq("id", id).single(),
    supabase.from("recipes").select("*"),
    supabase.from("pantry_items").select("*"),
  ]);
  if (!ev) throw new Error("No encontramos el evento.");
  const byId = new Map(((recipes ?? []) as Recipe[]).map((r) => [r.id, r]));
  const lists = (ev.menu as MenuItem[])
    .filter((m) => m.recipe_id && byId.has(m.recipe_id))
    .map((m) => scaleIngredients(byId.get(m.recipe_id!)!, m.portions));
  const merged = mergeIngredients(lists);
  const lines = checkPantry(merged, (pantry ?? []) as PantryItem[])
    .map(toShoppingLine)
    .filter((l): l is { name: string; quantity: string | null } => !!l);
  if (lines.length === 0) return 0;

  // No duplicar lo que ya está en la lista de este evento.
  const { data: existing } = await supabase.from("shopping_items").select("name").eq("event_id", id).eq("checked", false);
  const have = new Set((existing ?? []).map((e) => e.name.toLowerCase()));
  const rows = lines
    .filter((l) => !have.has(l.name.toLowerCase()))
    .map((l) => ({ name: l.name, quantity: l.quantity, category: "frescos", event_id: id, added_by: addedBy }));
  if (rows.length) {
    const { error } = await supabase.from("shopping_items").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidate(id);
  return rows.length;
}

export async function addEventTask(id: string, title: string, assignedTo: string | null, dueDate: string) {
  const supabase = await createClient();
  const t = title.trim();
  if (!t) throw new Error("Falta la tarea.");
  const { error } = await supabase
    .from("daily_tasks")
    .insert({ title: t, assigned_to: assignedTo || null, due_date: dueDate, event_id: id });
  if (error) throw new Error(error.message);
  revalidate(id);
}
