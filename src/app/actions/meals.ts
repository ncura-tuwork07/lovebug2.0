"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, PantryItem, Recipe } from "@/lib/types";
import { checkPantry, parseIngredientLines, scaleIngredients, toShoppingLine } from "@/lib/kitchen";

export type MealInput = {
  day: string;
  slot: "almuerzo" | "cena";
  title: string;
  notes: string | null;
  recipe_id: string | null;
  portions: number | string | null;
  extra_ingredients: string; // texto libre, uno por línea o coma
  send_to_shopping: boolean;
  added_by: string | null;
};

export async function saveMeal(input: MealInput): Promise<{ added: number; skipped: number }> {
  const supabase = await createClient();
  const portions = input.portions ? Math.max(1, Math.round(Number(input.portions))) : null;

  let recipe: Recipe | null = null;
  if (input.recipe_id) {
    const { data } = await supabase.from("recipes").select("*").eq("id", input.recipe_id).maybeSingle();
    recipe = (data as Recipe) ?? null;
  }
  const title = input.title.trim() || recipe?.title || "";
  if (!title) throw new Error("Falta qué van a comer.");

  const { error } = await supabase.from("meal_plans").upsert(
    { day: input.day, slot: input.slot, title, notes: input.notes?.trim() || null, recipe_id: recipe?.id ?? null, portions },
    { onConflict: "day,slot" }
  );
  if (error) throw new Error(error.message);

  let added = 0;
  let skipped = 0;
  if (input.send_to_shopping) {
    const ingredients: Ingredient[] = [
      ...(recipe ? scaleIngredients(recipe, portions ?? recipe.portions) : []),
      ...parseIngredientLines(input.extra_ingredients || ""),
    ];
    if (ingredients.length) {
      const { data: pantry } = await supabase.from("pantry_items").select("*");
      const checks = checkPantry(ingredients, (pantry ?? []) as PantryItem[]);
      const rows = checks
        .map(toShoppingLine)
        .filter((l): l is { name: string; quantity: string | null } => !!l)
        .map((l) => ({ name: l.name, quantity: l.quantity, category: "frescos", added_by: input.added_by }));
      skipped = checks.length - rows.length;
      if (rows.length) {
        const { error: e2 } = await supabase.from("shopping_items").insert(rows);
        if (e2) throw new Error(e2.message);
        added = rows.length;
      }
      revalidatePath("/compras");
    }
  }
  revalidatePath("/menu");
  revalidatePath("/");
  return { added, skipped };
}

export async function deleteMeal(day: string, slot: "almuerzo" | "cena") {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_plans").delete().eq("day", day).eq("slot", slot);
  if (error) throw new Error(error.message);
  revalidatePath("/menu");
  revalidatePath("/");
}
