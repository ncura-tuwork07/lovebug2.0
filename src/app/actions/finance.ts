"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategory, IncomeSource } from "@/lib/types";

function revalidate() {
  revalidatePath("/finanzas");
  revalidatePath("/eventos");
  revalidatePath("/");
}

function parseAmount(value: number | string): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("El monto tiene que ser mayor a cero.");
  return Math.round(n * 100) / 100;
}

// ── Gastos ──────────────────────────────────────────────
export type ExpenseInput = {
  id?: string;
  description: string;
  amount: number | string;
  category: ExpenseCategory;
  paid_by: string | null;
  spent_at: string;
  is_fixed: boolean;
  event_id?: string | null;
  is_draft?: boolean;
};

export async function saveExpense(input: ExpenseInput) {
  const supabase = await createClient();
  const row = {
    description: input.description.trim(),
    amount: parseAmount(input.amount),
    category: input.category,
    paid_by: input.paid_by || null,
    spent_at: input.spent_at,
    is_fixed: input.is_fixed,
    event_id: input.event_id || null,
    is_draft: input.is_draft ?? false,
  };
  if (!row.description) throw new Error("Falta la descripción.");
  const { error } = input.id
    ? await supabase.from("expenses").update(row).eq("id", input.id)
    : await supabase.from("expenses").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Ingresos ────────────────────────────────────────────
export type IncomeInput = {
  id?: string;
  description: string;
  amount: number | string;
  source: IncomeSource;
  member_id: string | null;
  received_at: string;
  is_recurring: boolean;
  is_draft?: boolean;
};

export async function saveIncome(input: IncomeInput) {
  const supabase = await createClient();
  const row = {
    description: input.description.trim(),
    amount: parseAmount(input.amount),
    source: input.source,
    member_id: input.member_id || null,
    received_at: input.received_at,
    is_recurring: input.is_recurring,
    is_draft: input.is_draft ?? false,
  };
  if (!row.description) throw new Error("Falta la descripción.");
  const { error } = input.id
    ? await supabase.from("incomes").update(row).eq("id", input.id)
    : await supabase.from("incomes").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteIncome(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("incomes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// "Modo borrador": convierte en reales todos los ingresos y gastos hipotéticos de un mes
// (queda como la cuenta definitiva de ese mes, sin borrar el borrador).
export async function confirmDraftMonth(from: string, to: string): Promise<void> {
  const supabase = await createClient();
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("expenses").update({ is_draft: false }).eq("is_draft", true).gte("spent_at", from).lte("spent_at", to),
    supabase.from("incomes").update({ is_draft: false }).eq("is_draft", true).gte("received_at", from).lte("received_at", to),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  revalidate();
}

// ── Ahorro ──────────────────────────────────────────────
export type GoalInput = {
  id?: string;
  title: string;
  target_amount: number | string;
  current_amount: number | string;
  target_date: string | null;
  member_id: string | null;
};

export async function saveGoal(input: GoalInput) {
  const supabase = await createClient();
  const current = input.current_amount === "" || input.current_amount === 0 ? 0 : parseAmount(input.current_amount);
  const row = {
    title: input.title.trim(),
    target_amount: parseAmount(input.target_amount),
    current_amount: current,
    target_date: input.target_date || null,
    member_id: input.member_id || null,
  };
  if (!row.title) throw new Error("Falta el nombre del objetivo.");
  const { error } = input.id
    ? await supabase.from("savings_goals").update(row).eq("id", input.id)
    : await supabase.from("savings_goals").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function addToGoal(id: string, amount: number | string) {
  const supabase = await createClient();
  const delta = parseAmount(amount);
  const { data, error: readError } = await supabase.from("savings_goals").select("current_amount").eq("id", id).single();
  if (readError) throw new Error(readError.message);
  const { error } = await supabase
    .from("savings_goals")
    .update({ current_amount: Number(data.current_amount) + delta })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
