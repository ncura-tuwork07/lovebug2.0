"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventGuest, EventItemCategory, MenuItem, PantryItem, Recipe } from "@/lib/types";
import { checkPantry, mergeIngredients, scaleIngredients, toShoppingLine } from "@/lib/kitchen";
import { EVENT_ITEM_TO_SHOPPING, menuItemTotal } from "@/lib/events";
import { findOrCreateContactsByName } from "@/app/actions/contacts";

function revalidate(id?: string) {
  revalidatePath("/eventos");
  if (id) revalidatePath(`/eventos/${id}`);
  revalidatePath("/calendario");
  revalidatePath("/compras");
  revalidatePath("/finanzas");
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

  await syncCalendar(supabase, id!, row);
  revalidate(id);
  return id!;
}

type Sb = Awaited<ReturnType<typeof createClient>>;

// Mantiene el evento en el calendario (categoría social) sincronizado.
async function syncCalendar(
  supabase: Sb,
  id: string,
  row: { title: string; event_date: string; event_time: string | null; location: string | null; guests: number }
) {
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
}

export async function setEventStatus(id: string, status: "planning" | "done") {
  const supabase = await createClient();
  const { error } = await supabase.from("family_events").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(id);
}

export async function setEventMemoryNote(id: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("family_events").update({ memory_note: note.trim() || null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(id);
}

export async function deleteFamilyEvent(id: string) {
  const supabase = await createClient();
  // Borra los archivos del evento (fotos, tickets) antes de la fila.
  const { data: files } = await supabase.from("event_attachments").select("file_path").eq("event_id", id);
  if (files?.length) await supabase.storage.from("documents").remove(files.map((f) => f.file_path));
  const { error } = await supabase.from("family_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Menú ────────────────────────────────────────────────
export async function setEventMenu(id: string, menu: MenuItem[]) {
  const supabase = await createClient();
  const clean = menu
    .map((m, i) => ({
      key: m.key ?? `m${i}`, // platos viejos sin clave: la posición, igual que menuKey()
      recipe_id: m.recipe_id || null,
      title: m.title.trim(),
      portions: Math.max(1, Math.round(Number(m.portions) || 1)),
      per_adult: m.per_adult != null && Number(m.per_adult) > 0 ? Number(m.per_adult) : undefined,
      per_child: m.per_child != null && Number(m.per_child) >= 0 ? Number(m.per_child) : undefined,
    }))
    .filter((m) => m.title);
  const { error } = await supabase.from("family_events").update({ menu: clean }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(id);
}

// Calcula los ingredientes del menú (recetas escaladas al total por invitado), resta la despensa y manda lo que falta a Compras.
export async function sendEventMenuToShopping(id: string, addedBy: string | null): Promise<number> {
  const supabase = await createClient();
  const [{ data: ev }, { data: recipes }, { data: pantry }, { data: guests }] = await Promise.all([
    supabase.from("family_events").select("menu, guests").eq("id", id).single(),
    supabase.from("recipes").select("*"),
    supabase.from("pantry_items").select("*"),
    supabase.from("event_guests").select("*").eq("event_id", id),
  ]);
  if (!ev) throw new Error("No encontramos el evento.");
  const byId = new Map(((recipes ?? []) as Recipe[]).map((r) => [r.id, r]));
  const lists = (ev.menu as MenuItem[])
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.recipe_id && byId.has(m.recipe_id))
    .map(({ m, i }) => scaleIngredients(byId.get(m.recipe_id!)!, menuItemTotal(m, i, (guests ?? []) as EventGuest[], ev.guests)));
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

// ── Invitados ───────────────────────────────────────────
export type GuestInput = {
  id?: string;
  name: string;
  member_id?: string | null;
  is_child: boolean;
  confirmed: boolean;
  notes: string | null;
  portions?: Record<string, number>;
  saveToCircle?: boolean; // crea (o reutiliza) un contacto del Círculo con este nombre y lo vincula
};

async function syncGuestCount(supabase: Sb, eventId: string) {
  const { count } = await supabase.from("event_guests").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("confirmed", true);
  const { data: ev } = await supabase.from("family_events").select("title, event_date, event_time, location").eq("id", eventId).single();
  if (!ev) return;
  await supabase.from("family_events").update({ guests: count ?? 0 }).eq("id", eventId);
  await syncCalendar(supabase, eventId, { ...ev, guests: count ?? 0 });
}

export async function saveGuest(eventId: string, input: GuestInput) {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) throw new Error("Falta el nombre.");
  const portions = Object.fromEntries(
    Object.entries(input.portions ?? {})
      .map(([k, v]) => [k, Number(v)] as const)
      .filter(([, v]) => Number.isFinite(v) && v >= 0)
  );
  // Solo tocamos el vínculo con el Círculo si nos pidieron guardarlo ahora; si no, se conserva el que ya tenía.
  let contact_id: string | undefined;
  if (input.saveToCircle && !input.member_id) {
    const created = await findOrCreateContactsByName([name]);
    contact_id = created[name];
    if (contact_id && input.is_child) await supabase.from("contacts").update({ is_child: true }).eq("id", contact_id).eq("is_child", false);
  }
  const row = {
    name,
    member_id: input.member_id || null,
    ...(contact_id ? { contact_id } : {}),
    is_child: input.is_child,
    confirmed: input.confirmed,
    notes: input.notes?.trim() || null,
    portions,
  };
  const { error } = input.id
    ? await supabase.from("event_guests").update(row).eq("id", input.id)
    : await supabase.from("event_guests").insert({ ...row, event_id: eventId });
  if (error) throw new Error(error.message);
  await syncGuestCount(supabase, eventId);
  revalidate(eventId);
}

// Agrega varios de una (uno por línea o coma): "tío Pancho, abuela Cata, Abril".
// Si el nombre coincide con alguien del Círculo, lo vincula solo (evita cargarlo de nuevo cada vez).
export async function addGuestsBulk(eventId: string, text: string): Promise<number> {
  const supabase = await createClient();
  const names = text
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!names.length) return 0;
  const [{ count }, { data: circle }] = await Promise.all([
    supabase.from("event_guests").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.from("contacts").select("id, name, is_child").is("archived_at", null),
  ]);
  const byLower = new Map((circle ?? []).map((c) => [c.name.toLowerCase(), c] as const));
  const rows = names.map((name, i) => {
    const match = byLower.get(name.toLowerCase());
    return { event_id: eventId, name, contact_id: match?.id ?? null, is_child: match?.is_child ?? false, sort_order: (count ?? 0) + i };
  });
  const { error } = await supabase.from("event_guests").insert(rows);
  if (error) throw new Error(error.message);
  await syncGuestCount(supabase, eventId);
  revalidate(eventId);
  return rows.length;
}

// Del Círculo: agrega a quienes elijas (ya tildados), con si son peques resuelto solo.
export async function addContactsAsGuests(eventId: string, contactIds: string[]): Promise<number> {
  const supabase = await createClient();
  if (!contactIds.length) return 0;
  const [{ data: contacts }, { data: existing }, { count }] = await Promise.all([
    supabase.from("contacts").select("id, name, is_child").in("id", contactIds),
    supabase.from("event_guests").select("contact_id").eq("event_id", eventId),
    supabase.from("event_guests").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);
  const have = new Set((existing ?? []).map((g) => g.contact_id).filter(Boolean));
  const rows = (contacts ?? [])
    .filter((c) => !have.has(c.id))
    .map((c, i) => ({ event_id: eventId, name: c.name, contact_id: c.id, is_child: c.is_child, sort_order: (count ?? 0) + i }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("event_guests").insert(rows);
  if (error) throw new Error(error.message);
  await syncGuestCount(supabase, eventId);
  revalidate(eventId);
  return rows.length;
}

// Suma a los de casa como invitados (sin repetir).
export async function addHouseholdAsGuests(eventId: string): Promise<number> {
  const supabase = await createClient();
  const [{ data: members }, { data: existing }] = await Promise.all([
    supabase.from("family_members").select("id, name, is_child").order("sort_order"),
    supabase.from("event_guests").select("member_id").eq("event_id", eventId),
  ]);
  const have = new Set((existing ?? []).map((g) => g.member_id).filter(Boolean));
  const rows = (members ?? []).filter((m) => !have.has(m.id)).map((m, i) => ({ event_id: eventId, name: m.name, member_id: m.id, is_child: m.is_child, sort_order: -100 + i }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("event_guests").insert(rows);
  if (error) throw new Error(error.message);
  await syncGuestCount(supabase, eventId);
  revalidate(eventId);
  return rows.length;
}

export async function deleteGuest(eventId: string, guestId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_guests").delete().eq("id", guestId);
  if (error) throw new Error(error.message);
  await syncGuestCount(supabase, eventId);
  revalidate(eventId);
}

// ── Compras extra (bebidas, decoración, vajilla…) ───────
export type EventItemInput = {
  id?: string;
  category: EventItemCategory;
  name: string;
  quantity: string | null;
  store: string | null;
  estimated_cost: number | string | null;
  notes: string | null;
};

export async function saveEventItem(eventId: string, input: EventItemInput) {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) throw new Error("Falta qué hay que comprar.");
  const cost = input.estimated_cost === null || input.estimated_cost === "" ? null : Number(String(input.estimated_cost).replace(",", "."));
  const row = {
    category: input.category,
    name,
    quantity: input.quantity?.trim() || null,
    store: input.store?.trim() || null,
    estimated_cost: cost != null && Number.isFinite(cost) && cost > 0 ? cost : null,
    notes: input.notes?.trim() || null,
  };
  const { error } = input.id
    ? await supabase.from("event_items").update(row).eq("id", input.id)
    : await supabase.from("event_items").insert({ ...row, event_id: eventId });
  if (error) throw new Error(error.message);
  revalidate(eventId);
}

export async function toggleEventItem(eventId: string, id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_items").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(eventId);
}

export async function deleteEventItem(eventId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(eventId);
}

// Manda las compras extra pendientes a la lista de Compras (con la etiqueta del evento).
export async function sendEventItemsToShopping(eventId: string, addedBy: string | null): Promise<number> {
  const supabase = await createClient();
  const [{ data: items }, { data: existing }] = await Promise.all([
    supabase.from("event_items").select("*").eq("event_id", eventId).eq("done", false),
    supabase.from("shopping_items").select("name").eq("event_id", eventId).eq("checked", false),
  ]);
  const have = new Set((existing ?? []).map((e) => e.name.toLowerCase()));
  const rows = (items ?? [])
    .filter((i) => !have.has(i.name.toLowerCase()))
    .map((i) => ({
      // El lugar de compra viaja en el nombre: "Globos (Cotillón Pepe)".
      name: i.store ? `${i.name} (${i.store})` : i.name,
      quantity: i.quantity,
      category: EVENT_ITEM_TO_SHOPPING[i.category as EventItemCategory] ?? "otro",
      event_id: eventId,
      added_by: addedBy,
    }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("shopping_items").insert(rows);
  if (error) throw new Error(error.message);
  revalidate(eventId);
  return rows.length;
}

// ── Gastos con ticket, fotos y recuerdos ────────────────
export async function addEventExpense(
  eventId: string,
  input: { description: string; amount: number | string; paid_by: string | null; spent_at: string; receipt_path: string | null }
) {
  const supabase = await createClient();
  const n = Number(String(input.amount).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("El monto tiene que ser mayor a cero.");
  const description = input.description.trim();
  if (!description) throw new Error("Falta qué se compró.");
  const { error } = await supabase.from("expenses").insert({
    description,
    amount: Math.round(n * 100) / 100,
    category: "ocio",
    paid_by: input.paid_by || null,
    spent_at: input.spent_at,
    is_fixed: false,
    event_id: eventId,
    receipt_path: input.receipt_path,
  });
  if (error) throw new Error(error.message);
  revalidate(eventId);
}

export async function addEventAttachment(
  eventId: string,
  input: { kind: "foto" | "video" | "audio" | "ticket" | "archivo"; title: string | null; file_path: string; mime_type: string | null; size_bytes?: number | null }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_attachments").insert({ ...input, event_id: eventId, title: input.title?.trim() || null });
  if (error) throw new Error(error.message);
  revalidate(eventId);
}

export async function deleteEventAttachment(eventId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("event_attachments").select("file_path").eq("id", id).single();
  if (data) await supabase.storage.from("documents").remove([data.file_path]);
  const { error } = await supabase.from("event_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(eventId);
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
