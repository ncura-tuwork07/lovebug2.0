"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBudget(category: string, monthlyLimit: number | string) {
  const supabase = await createClient();
  const limit = Number(monthlyLimit);
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("El límite tiene que ser mayor a cero.");
  const { error } = await supabase
    .from("budgets")
    .upsert({ category, monthly_limit: Math.round(limit) }, { onConflict: "category" });
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas");
}

export async function deleteBudget(category: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("category", category);
  if (error) throw new Error(error.message);
  revalidatePath("/finanzas");
}
