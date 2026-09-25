"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BillCycleStatus, ExpenseCategory, ReminderCategory } from "@/lib/types";

function revalidate() {
  revalidatePath("/finanzas");
  revalidatePath("/vencimientos");
  revalidatePath("/");
}

// A qué categoría de gasto va cada tipo de vencimiento, cuando se marca como pagado.
const CATEGORY_MAP: Record<ReminderCategory, ExpenseCategory> = {
  seguro: "servicios",
  servicio: "servicios",
  impuesto: "otro",
  colegio: "educacion",
  salud: "salud",
  auto: "auto",
  casa: "alquiler",
  otro: "otro",
};

// Pausar (no se paga este mes, pero sigue el que viene) o volver a pendiente.
export async function setBillCycleStatus(reminderId: string, month: string, status: Extract<BillCycleStatus, "pendiente" | "pausada">): Promise<void> {
  const supabase = await createClient();
  if (status === "pendiente") {
    // Sin fila = pendiente por defecto; borrar la fila alcanza (y no deja gastos sueltos).
    const { data: existing } = await supabase.from("bill_cycles").select("id, expense_id").eq("reminder_id", reminderId).eq("month", month).maybeSingle();
    if (existing?.expense_id) await supabase.from("expenses").delete().eq("id", existing.expense_id);
    if (existing) await supabase.from("bill_cycles").delete().eq("id", existing.id);
    revalidate();
    return;
  }
  const { error } = await supabase.from("bill_cycles").upsert({ reminder_id: reminderId, month, status: "pausada" }, { onConflict: "reminder_id,month" });
  if (error) throw new Error(error.message);
  revalidate();
}

export type MarkBillPaidInput = {
  reminderId: string;
  month: string;
  amount: number | string;
  paidBy: string | null;
  spentAt: string;
};

// Marca la cuenta como pagada: crea el gasto en Finanzas y deja el vínculo para poder deshacerlo.
export async function markBillPaid(input: MarkBillPaidInput): Promise<void> {
  const supabase = await createClient();
  const n = Number(String(input.amount).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) throw new Error("El monto tiene que ser mayor a cero.");

  const { data: reminder, error: rErr } = await supabase.from("reminders").select("title, category").eq("id", input.reminderId).single();
  if (rErr) throw new Error(rErr.message);

  const { data: expense, error: eErr } = await supabase
    .from("expenses")
    .insert({
      description: reminder.title,
      amount: Math.round(n * 100) / 100,
      category: CATEGORY_MAP[reminder.category as ReminderCategory] ?? "otro",
      paid_by: input.paidBy,
      spent_at: input.spentAt,
      is_fixed: true,
    })
    .select("id")
    .single();
  if (eErr) throw new Error(eErr.message);

  const { error } = await supabase
    .from("bill_cycles")
    .upsert(
      { reminder_id: input.reminderId, month: input.month, status: "pagada", amount: Math.round(n * 100) / 100, expense_id: expense.id },
      { onConflict: "reminder_id,month" }
    );
  if (error) throw new Error(error.message);
  revalidate();
}

// Deshace el pago: borra el gasto que se había creado y vuelve la cuenta a pendiente.
export async function unmarkBillPaid(reminderId: string, month: string): Promise<void> {
  const supabase = await createClient();
  const { data: cycle } = await supabase.from("bill_cycles").select("id, expense_id").eq("reminder_id", reminderId).eq("month", month).maybeSingle();
  if (cycle?.expense_id) await supabase.from("expenses").delete().eq("id", cycle.expense_id);
  if (cycle) await supabase.from("bill_cycles").delete().eq("id", cycle.id);
  revalidate();
}
