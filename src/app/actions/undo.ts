"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Vuelve a poner lo que se acaba de borrar (el botón "Deshacer"). Solo tablas simples del hogar;
// RLS se asegura de que la fila sea del propio hogar.
const RESTORABLE: Record<string, string[]> = {
  daily_tasks: ["/", "/puntos"],
  shopping_items: ["/compras", "/"],
  calendar_events: ["/calendario", "/"],
  logistics_trips: ["/logistica", "/"],
  expenses: ["/finanzas"],
  incomes: ["/finanzas"],
  savings_goals: ["/finanzas"],
  budgets: ["/finanzas"],
  reminders: ["/vencimientos", "/calendario", "/"],
  important_dates: ["/calendario", "/"],
  projects: ["/proyectos"],
  pantry_items: ["/despensa"],
  recipes: ["/recetas", "/menu"],
  meal_plans: ["/menu", "/"],
  rewards: ["/puntos"],
};

export type DeletedRows = { table: string; rows: Record<string, unknown>[] };

export async function restoreRows({ table, rows }: DeletedRows): Promise<void> {
  const paths = RESTORABLE[table];
  if (!paths) throw new Error("Eso no se puede deshacer.");
  if (!rows.length) return;
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(error.message);
  for (const p of paths) revalidatePath(p);
}
