"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentKind } from "@/lib/types";

function revalidate(id: string) {
  revalidatePath(`/familia/${id}`);
  revalidatePath("/familia");
  revalidatePath("/mapa");
  revalidatePath("/");
}

export type ProfileInput = {
  id: string;
  name: string;
  nickname: string | null;
  birthday: string | null;
  dni: string | null;
  phone: string | null;
  blood_type: string | null;
  allergies: string | null;
  school: string | null;
  doctor: string | null;
  notes: string | null;
  color: string;
};

export async function updateProfile(input: ProfileInput) {
  const supabase = await createClient();
  const clean = (v: string | null) => v?.trim() || null;
  const row = {
    name: input.name.trim(),
    nickname: clean(input.nickname),
    birthday: input.birthday || null,
    dni: clean(input.dni),
    phone: clean(input.phone),
    blood_type: clean(input.blood_type),
    allergies: clean(input.allergies),
    school: clean(input.school),
    doctor: clean(input.doctor),
    notes: clean(input.notes),
    color: input.color,
  };
  if (!row.name) throw new Error("Falta el nombre.");
  const { error } = await supabase.from("family_members").update(row).eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidate(input.id);
}

export async function setPhoto(id: string, photoUrl: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("family_members").update({ photo_url: photoUrl }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(id);
}

export async function setShareLocation(id: string, share: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("family_members").update({ share_location: share }).eq("id", id);
  if (error) throw new Error(error.message);
  if (!share) await supabase.from("locations").delete().eq("member_id", id);
  revalidate(id);
}

export async function addDocument(input: {
  member_id: string;
  title: string;
  kind: DocumentKind;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
}) {
  const supabase = await createClient();
  const title = input.title.trim();
  if (!title) throw new Error("Falta el nombre del documento.");
  const { error } = await supabase.from("documents").insert({ ...input, title });
  if (error) throw new Error(error.message);
  revalidate(input.member_id);
}

export async function deleteDocument(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("member_id, file_path").eq("id", id).single();
  if (!data) return;
  await supabase.storage.from("documents").remove([data.file_path]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate(data.member_id ?? "");
}
