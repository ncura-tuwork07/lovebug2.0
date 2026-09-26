"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeletedRows } from "@/app/actions/undo";
import type { ShoppingCategory } from "@/lib/types";

export async function addShoppingItems(
  items: { name: string; quantity?: string | null; category?: ShoppingCategory }[],
  addedBy: string | null
) {
  const supabase = await createClient();
  const rows = items
    .map((i) => ({
      name: i.name.trim(),
      quantity: i.quantity?.trim() || null,
      category: i.category ?? "otro",
      added_by: addedBy,
    }))
    .filter((r) => r.name);
  if (rows.length === 0) return;
  const { error } = await supabase.from("shopping_items").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/compras");
}

export async function updateShoppingItem(
  id: string,
  patch: { name?: string; quantity?: string | null; category?: ShoppingCategory }
) {
  const supabase = await createClient();
  const row = {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.quantity !== undefined ? { quantity: patch.quantity?.trim() || null } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
  };
  const { error } = await supabase.from("shopping_items").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/compras");
}

export async function toggleShoppingItem(id: string, checked: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_items")
    .update({ checked, checked_at: checked ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/compras");
}

export async function deleteShoppingItem(id: string): Promise<DeletedRows> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shopping_items").delete().eq("id", id).select();
  if (error) throw new Error(error.message);
  revalidatePath("/compras");
  return { table: "shopping_items", rows: data ?? [] };
}

export async function clearCheckedShopping() {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_items").delete().eq("checked", true);
  if (error) throw new Error(error.message);
  revalidatePath("/compras");
}
