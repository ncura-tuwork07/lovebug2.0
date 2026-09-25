"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COOKIE } from "@/lib/data";

// El selector "¿Quién sos?": elegís con qué perfil del hogar vas a usar la app en este dispositivo.
// No es una barrera de seguridad — todo el hogar ve lo mismo — solo decide de quién son las cosas
// por defecto. Igual validamos que el perfil sea de tu hogar (RLS ya lo filtra al leerlo).
export async function chooseProfile(memberId: string): Promise<void> {
  const supabase = await createClient();
  const { data: member, error } = await supabase.from("family_members").select("id").eq("id", memberId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!member) throw new Error("Ese perfil no es de tu hogar.");
  const store = await cookies();
  store.set(PROFILE_COOKIE, memberId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

// "Cambiar de perfil": vuelve a preguntar, sin cerrar la sesión.
export async function clearProfile(): Promise<void> {
  const store = await cookies();
  store.delete(PROFILE_COOKIE);
  revalidatePath("/", "layout");
}
