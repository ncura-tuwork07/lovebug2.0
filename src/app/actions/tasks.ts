"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TaskInput = {
  id?: string;
  title: string;
  assigned_to: string | null;
  due_date: string;
  notes: string | null;
};

export async function saveTask(input: TaskInput) {
  const supabase = await createClient();
  const row = {
    title: input.title.trim(),
    assigned_to: input.assigned_to || null,
    due_date: input.due_date,
    notes: input.notes?.trim() || null,
  };
  if (!row.title) throw new Error("Falta el título.");

  const { error } = input.id
    ? await supabase.from("daily_tasks").update(row).eq("id", input.id)
    : await supabase.from("daily_tasks").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function toggleTask(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_tasks").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
