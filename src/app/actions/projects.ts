"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Horizon } from "@/lib/types";

export type ProjectInput = {
  id?: string;
  title: string;
  description: string | null;
  horizon: Horizon;
  progress: number;
  due_date: string | null;
  member_id: string | null;
};

function revalidate() {
  revalidatePath("/proyectos");
  revalidatePath("/");
}

export async function saveProject(input: ProjectInput) {
  const supabase = await createClient();
  const progress = Math.max(0, Math.min(100, Math.round(Number(input.progress) || 0)));
  const row = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    horizon: input.horizon,
    progress,
    status: progress >= 100 ? "done" : progress > 0 ? "in_progress" : "todo",
    due_date: input.due_date || null,
    member_id: input.member_id || null,
  };
  if (!row.title) throw new Error("Falta el título.");
  const { error } = input.id
    ? await supabase.from("projects").update(row).eq("id", input.id)
    : await supabase.from("projects").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function setProjectProgress(id: string, progress: number) {
  const supabase = await createClient();
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  const { error } = await supabase
    .from("projects")
    .update({ progress: p, status: p >= 100 ? "done" : p > 0 ? "in_progress" : "todo" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
