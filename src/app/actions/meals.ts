"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MealInput = {
  day: string;
  slot: "almuerzo" | "cena";
  title: string;
  notes: string | null;
  ingredients: string[]; // se agregan a la lista de compras
  added_by: string | null;
};

export async function saveMeal(input: MealInput) {
  const supabase = await createClient();
  const title = input.title.trim();
  if (!title) throw new Error("Falta qué van a comer.");

  const { error } = await supabase
    .from("meal_plans")
    .upsert({ day: input.day, slot: input.slot, title, notes: input.notes?.trim() || null }, { onConflict: "day,slot" });
  if (error) throw new Error(error.message);

  const ingredients = input.ingredients.map((s) => s.trim()).filter(Boolean);
  if (ingredients.length > 0) {
    const { error: e2 } = await supabase
      .from("shopping_items")
      .insert(ingredients.map((name) => ({ name, category: "frescos", added_by: input.added_by })));
    if (e2) throw new Error(e2.message);
    revalidatePath("/compras");
  }
  revalidatePath("/menu");
  revalidatePath("/");
}

export async function deleteMeal(day: string, slot: "almuerzo" | "cena") {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_plans").delete().eq("day", day).eq("slot", slot);
  if (error) throw new Error(error.message);
  revalidatePath("/menu");
  revalidatePath("/");
}
