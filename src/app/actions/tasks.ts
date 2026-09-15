"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TaskInput = {
  id?: string;
  title: string;
  assigned_to: string | null;
  due_date: string;
  notes: string | null;
  points: number;
};

function revalidate() {
  revalidatePath("/");
  revalidatePath("/puntos");
}

export async function saveTask(input: TaskInput) {
  const supabase = await createClient();
  const row = {
    title: input.title.trim(),
    assigned_to: input.assigned_to || null,
    due_date: input.due_date,
    notes: input.notes?.trim() || null,
    points: Math.max(0, Math.round(Number(input.points) || 0)),
  };
  if (!row.title) throw new Error("Falta el título.");

  const { error } = input.id
    ? await supabase.from("daily_tasks").update(row).eq("id", input.id)
    : await supabase.from("daily_tasks").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

// Al completar una tarea con puntos, se acreditan a quien la tenía asignada.
export async function toggleTask(id: string, done: boolean) {
  const supabase = await createClient();
  const { data: task } = await supabase.from("daily_tasks").select("title, assigned_to, points").eq("id", id).single();

  const { error } = await supabase.from("daily_tasks").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);

  if (task?.assigned_to && task.points > 0) {
    if (done) {
      await supabase.from("points_ledger").insert({
        member_id: task.assigned_to,
        points: task.points,
        reason: task.title,
        ref_id: id,
      });
    } else {
      await supabase.from("points_ledger").delete().eq("ref_id", id);
    }
  }
  revalidate();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
