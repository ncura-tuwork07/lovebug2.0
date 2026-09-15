"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient } from "@/lib/types";

export type RecipeInput = {
  id?: string;
  title: string;
  portions: number | string;
  ingredients: Ingredient[];
  steps: string | null;
  prep_minutes: number | string | null;
  tags: string[];
};

function revalidate() {
  revalidatePath("/recetas");
  revalidatePath("/menu");
  revalidatePath("/eventos");
}

export async function saveRecipe(input: RecipeInput) {
  const supabase = await createClient();
  const portions = Math.max(1, Math.round(Number(input.portions) || 4));
  const ingredients = input.ingredients
    .map((i) => ({
      name: i.name.trim(),
      quantity: i.quantity == null || i.quantity === ("" as unknown) ? null : Number(i.quantity),
      unit: i.unit || "u",
    }))
    .filter((i) => i.name);
  const prep = input.prep_minutes === null || input.prep_minutes === "" ? null : Math.round(Number(input.prep_minutes));
  const row = {
    title: input.title.trim(),
    portions,
    ingredients,
    steps: input.steps?.trim() || null,
    prep_minutes: prep !== null && Number.isFinite(prep) ? prep : null,
    tags: input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
  };
  if (!row.title) throw new Error("Falta el nombre de la receta.");
  const { error } = input.id
    ? await supabase.from("recipes").update(row).eq("id", input.id)
    : await supabase.from("recipes").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
