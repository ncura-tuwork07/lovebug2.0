"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_ROLE } from "@/lib/roles";

export type MemberInput = {
  id?: string;
  name: string;
  role: string;
  is_child: boolean;
  color: string;
  birthday: string | null;
  notes: string | null;
};

function revalidateAll() {
  for (const p of ["/", "/familia", "/calendario", "/logistica", "/finanzas", "/proyectos"]) revalidatePath(p);
}

export async function saveMember(input: MemberInput) {
  const supabase = await createClient();
  const row = {
    name: input.name.trim(),
    role: input.role.trim() || FALLBACK_ROLE,
    is_child: input.is_child,
    color: input.color,
    birthday: input.birthday || null,
    notes: input.notes?.trim() || null,
  };
  if (!row.name) throw new Error("Falta el nombre.");
  const { error } = input.id
    ? await supabase.from("family_members").update(row).eq("id", input.id)
    : await supabase.from("family_members").insert({ ...row, sort_order: 10 });
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function deleteMember(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("family_members").select("user_id").eq("id", id).single();
  if (data?.user_id) throw new Error("No se puede borrar un usuario con cuenta de acceso.");
  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAll();
}
