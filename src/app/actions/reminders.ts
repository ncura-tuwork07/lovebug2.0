"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReminderCategory } from "@/lib/types";

function revalidate() {
  revalidatePath("/vencimientos");
  revalidatePath("/calendario");
  revalidatePath("/");
}

// ── Vencimientos ────────────────────────────────────────
export type ReminderInput = {
  id?: string;
  title: string;
  due_date: string;
  category: ReminderCategory;
  amount: number | string | null;
  member_id: string | null;
  notify_days_before: number;
  repeat: "none" | "monthly" | "yearly";
  repeat_until: string | null;
  notes: string | null;
};

export async function saveReminder(input: ReminderInput) {
  const supabase = await createClient();
  const amount = input.amount === null || input.amount === "" ? null : Number(input.amount);
  const row = {
    title: input.title.trim(),
    due_date: input.due_date,
    category: input.category,
    amount: amount !== null && Number.isFinite(amount) && amount > 0 ? amount : null,
    member_id: input.member_id || null,
    notify_days_before: Math.max(0, Math.min(60, Number(input.notify_days_before) || 0)),
    repeat: input.repeat,
    repeat_until: input.repeat === "none" ? null : input.repeat_until || null,
    notes: input.notes?.trim() || null,
  };
  if (!row.title) throw new Error("Falta el título.");
  const { error } = input.id
    ? await supabase.from("reminders").update(row).eq("id", input.id)
    : await supabase.from("reminders").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

// Marcar como pagado/hecho. Si se repite, avanza la fecha en vez de cerrarlo.
export async function completeReminder(id: string) {
  const supabase = await createClient();
  const { data, error: readError } = await supabase.from("reminders").select("due_date, repeat").eq("id", id).single();
  if (readError) throw new Error(readError.message);

  let patch: Record<string, unknown> = { done: true };
  if (data.repeat !== "none") {
    const d = new Date(`${data.due_date}T12:00:00Z`);
    if (data.repeat === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCFullYear(d.getUTCFullYear() + 1);
    patch = { due_date: d.toISOString().slice(0, 10), done: false };
  }
  const { error } = await supabase.from("reminders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function reopenReminder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").update({ done: false }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteReminder(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Fechas importantes ──────────────────────────────────
export type ImportantDateInput = {
  id?: string;
  title: string;
  date: string; // YYYY-MM-DD; el año es opcional para el recordatorio
  kind: "cumple" | "aniversario" | "otro";
  member_id: string | null;
  remind_days_before: number;
  gift_ideas: string | null;
};

export async function saveImportantDate(input: ImportantDateInput) {
  const supabase = await createClient();
  const [y, m, d] = input.date.split("-").map(Number);
  if (!m || !d) throw new Error("Falta la fecha.");
  const row = {
    title: input.title.trim(),
    month: m,
    day: d,
    year: y || null,
    kind: input.kind,
    member_id: input.member_id || null,
    remind_days_before: Math.max(0, Math.min(60, Number(input.remind_days_before) || 0)),
    gift_ideas: input.gift_ideas?.trim() || null,
  };
  if (!row.title) throw new Error("Falta el título.");
  const { error } = input.id
    ? await supabase.from("important_dates").update(row).eq("id", input.id)
    : await supabase.from("important_dates").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteImportantDate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("important_dates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
