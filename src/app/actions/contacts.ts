"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidate() {
  revalidatePath("/circulo");
  revalidatePath("/eventos");
  revalidatePath("/vencimientos");
  revalidatePath("/calendario");
  revalidatePath("/");
}

export type ContactInput = {
  id?: string;
  name: string;
  relationship: string | null;
  birthday: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_child: boolean;
};

// Devuelve el id (para subirle la foto a alguien recién agregado).
export async function saveContact(input: ContactInput): Promise<string> {
  const supabase = await createClient();
  const name = input.name.trim();
  if (!name) throw new Error("Falta el nombre.");
  const row = {
    name,
    relationship: input.relationship?.trim() || null,
    birthday: input.birthday || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    is_child: input.is_child,
  };
  if (input.id) {
    const { error } = await supabase.from("contacts").update(row).eq("id", input.id);
    if (error) throw new Error(error.message);
    revalidate();
    return input.id;
  }
  const { data, error } = await supabase.from("contacts").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  revalidate();
  return data.id as string;
}

// Crea contactos nuevos a partir de nombres sueltos (ej. invitados de un evento sin cuenta ni contacto).
// Evita duplicar: si ya existe un contacto con ese nombre (case-insensitive), lo reutiliza.
export async function findOrCreateContactsByName(names: string[]): Promise<Record<string, string>> {
  const supabase = await createClient();
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!clean.length) return {};

  const { data: existing } = await supabase.from("contacts").select("id, name").is("archived_at", null);
  const byLower = new Map((existing ?? []).map((c) => [c.name.toLowerCase(), c.id] as const));

  const toCreate = clean.filter((n) => !byLower.has(n.toLowerCase()));
  if (toCreate.length) {
    const { data: created, error } = await supabase
      .from("contacts")
      .insert(toCreate.map((name) => ({ name })))
      .select("id, name");
    if (error) throw new Error(error.message);
    for (const c of created ?? []) byLower.set(c.name.toLowerCase(), c.id);
  }
  revalidate();
  const result: Record<string, string> = {};
  for (const n of clean) result[n] = byLower.get(n.toLowerCase())!;
  return result;
}

export async function setContactPhoto(id: string, photoUrl: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").update({ photo_url: photoUrl }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// Saca a alguien del Círculo sin romper eventos pasados que lo tienen como invitado.
export async function archiveContact(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
