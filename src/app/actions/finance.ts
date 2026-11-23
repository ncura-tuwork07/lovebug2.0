"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeletedRows } from "@/app/actions/undo";
import type { ExpenseCategory, ExpenseStatus, IncomeSource, IncomeStatus, PaymentMethod } from "@/lib/types";

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
  status?: ExpenseStatus;
  payment_method?: PaymentMethod | null;
  notes?: string | null;
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
    status: input.status === "pendiente" ? "pendiente" : "pagado",
    payment_method: input.payment_method || null,
    notes: input.notes?.trim() || null,
  };
  if (!row.description) throw new Error("Falta la descripción.");
  const { error } = input.id
    ? await supabase.from("expenses").update(row).eq("id", input.id)
    : await supabase.from("expenses").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

// Un toque en la lista: pagado ↔ pendiente (el medio de pago y el detalle se cambian editando).
export async function setExpenseStatus(id: string, status: ExpenseStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update({ status: status === "pendiente" ? "pendiente" : "pagado" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// Mes nuevo: trae los gastos fijos del mes anterior (alquiler, servicios, cuotas…) como
// pendientes, el mismo día del mes, con quién paga, el medio y el detalle. No repite los que ya
// están cargados en el mes nuevo (mismo nombre).
export async function copyFixedExpenses(fromMonth: string, toMonth: string): Promise<number> {
  const supabase = await createClient();
  const range = (month: string) => {
    const d = new Date(`${month}T12:00:00-03:00`);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return { start: month.slice(0, 8) + "01", end: month.slice(0, 8) + String(last).padStart(2, "0"), last };
  };
  const src = range(fromMonth);
  const dst = range(toMonth);
  const [{ data: fixed, error }, { data: already }] = await Promise.all([
    supabase.from("expenses").select("*").eq("is_fixed", true).gte("spent_at", src.start).lte("spent_at", src.end),
    supabase.from("expenses").select("description").gte("spent_at", dst.start).lte("spent_at", dst.end),
  ]);
  if (error) throw new Error(error.message);
  const taken = new Set((already ?? []).map((e) => String(e.description).trim().toLowerCase()));
  const rows = (fixed ?? [])
    .filter((e) => !taken.has(String(e.description).trim().toLowerCase()))
    .map((e) => ({
      description: e.description,
      amount: e.amount,
      category: e.category,
      paid_by: e.paid_by,
      spent_at: dst.start.slice(0, 8) + String(Math.min(Number(String(e.spent_at).slice(8, 10)), dst.last)).padStart(2, "0"),
      is_fixed: true,
      is_draft: false,
      status: "pendiente",
      payment_method: e.payment_method,
      notes: e.notes,
    }));
  if (rows.length === 0) return 0;
  const { error: insertError } = await supabase.from("expenses").insert(rows);
  if (insertError) throw new Error(insertError.message);
  revalidate();
  return rows.length;
}

export async function deleteExpense(id: string): Promise<DeletedRows> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").delete().eq("id", id).select();
  if (error) throw new Error(error.message);
  revalidate();
  return { table: "expenses", rows: data ?? [] };
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
  status?: IncomeStatus;
  notes?: string | null;
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
    status: input.status === "por_cobrar" ? "por_cobrar" : "cobrado",
    notes: input.notes?.trim() || null,
  };
  if (!row.description) throw new Error("Falta la descripción.");
  const { error } = input.id
    ? await supabase.from("incomes").update(row).eq("id", input.id)
    : await supabase.from("incomes").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteIncome(id: string): Promise<DeletedRows> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("incomes").delete().eq("id", id).select();
  if (error) throw new Error(error.message);
  revalidate();
  return { table: "incomes", rows: data ?? [] };
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

export async function deleteGoal(id: string): Promise<DeletedRows> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("savings_goals").delete().eq("id", id).select();
  if (error) throw new Error(error.message);
  revalidate();
  return { table: "savings_goals", rows: data ?? [] };
}
