"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingCategory } from "@/lib/types";

function revalidate() {
  revalidatePath("/despensa");
  revalidatePath("/compras");
  revalidatePath("/menu");
}

export type PantryInput = {
  id?: string;
  name: string;
  quantity: number | string;
  unit: string;
  category: ShoppingCategory;
  notes: string | null;
};

export async function savePantryItem(input: PantryInput) {
  const supabase = await createClient();
  const qty = Number(String(input.quantity).replace(",", "."));
  const row = {
    name: input.name.trim(),
    quantity: Number.isFinite(qty) && qty >= 0 ? qty : 1,
    unit: input.unit || "u",
    category: input.category,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (!row.name) throw new Error("Falta el nombre.");
  const { error } = input.id
    ? await supabase.from("pantry_items").update(row).eq("id", input.id)
    : await supabase.from("pantry_items").insert(row);
  if (error) throw new Error(error.code === "23505" ? "Ya existe en la despensa." : error.message);
  revalidate();
}

export async function adjustPantry(id: string, delta: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("pantry_items").select("quantity").eq("id", id).single();
  if (!data) return;
  const next = Math.max(0, Number(data.quantity) + delta);
  const { error } = await supabase
    .from("pantry_items")
    .update({ quantity: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deletePantryItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pantry_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// Pasa lo comprado (tachado en Compras) a la despensa y vacía el changuito.
export async function moveCheckedToPantry() {
  const supabase = await createClient();
  const { data: bought } = await supabase.from("shopping_items").select("id, name, quantity, category").eq("checked", true);
  if (!bought?.length) return 0;

  const { data: pantry } = await supabase.from("pantry_items").select("id, name, quantity");
  const byName = new Map((pantry ?? []).map((p) => [p.name.toLowerCase().trim(), p]));

  for (const b of bought) {
    const m = (b.quantity ?? "").match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?/);
    const qty = m ? Number(m[1].replace(",", ".")) : 1;
    const unit = m?.[2]?.toLowerCase() ?? "u";
    const existing = byName.get(b.name.toLowerCase().trim());
    if (existing) {
      await supabase
        .from("pantry_items")
        .update({ quantity: Number(existing.quantity) + qty, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("pantry_items").insert({ name: b.name, quantity: qty, unit, category: b.category });
    }
  }
  await supabase.from("shopping_items").delete().in("id", bought.map((b) => b.id));
  revalidate();
  return bought.length;
}
