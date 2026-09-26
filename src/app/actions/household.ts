"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_ROLE } from "@/lib/roles";
import type { HouseholdSettings, Tradition } from "@/lib/types";

const COLORS = ["#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6", "#0EA5A5"];

function friendly(message: string): string {
  if (/Ya pertenecés/.test(message)) return "Ya pertenecés a un hogar.";
  if (/inválido/.test(message)) return "Ese código de invitación no existe. Revisalo y probá de nuevo.";
  if (/No autenticado/.test(message)) return "Tenés que iniciar sesión primero.";
  return message;
}

// Crea el hogar y el primer integrante (el usuario logueado).
export async function createHousehold(input: { name: string; memberName: string; role?: string }): Promise<void> {
  const supabase = await createClient();
  const name = input.name.trim();
  const memberName = input.memberName.trim();
  if (!name) throw new Error("Ponele un nombre al hogar.");
  if (!memberName) throw new Error("Falta tu nombre.");
  const { error } = await supabase.rpc("create_household", { p_name: name, p_member_name: memberName, p_color: COLORS[0], p_role: input.role?.trim() || FALLBACK_ROLE });
  if (error) throw new Error(friendly(error.message));
  revalidatePath("/", "layout");
}

// Se suma a un hogar existente con el código de invitación.
export async function joinHousehold(input: { code: string; memberName: string; role?: string }): Promise<void> {
  const supabase = await createClient();
  const code = input.code.trim().toUpperCase();
  const memberName = input.memberName.trim();
  if (!code) throw new Error("Falta el código de invitación.");
  if (!memberName) throw new Error("Falta tu nombre.");
  const { error } = await supabase.rpc("join_household", { p_code: code, p_member_name: memberName, p_color: COLORS[1], p_role: input.role?.trim() || FALLBACK_ROLE });
  if (error) throw new Error(friendly(error.message));
  // Recién ahora vemos al resto del hogar: elegimos un color que nadie use.
  const [{ data: members }, { data: auth }] = await Promise.all([supabase.from("family_members").select("id, color, user_id"), supabase.auth.getUser()]);
  const mine = members?.find((m) => m.user_id === auth.user?.id);
  const used = new Set(members?.filter((m) => m.id !== mine?.id).map((m) => m.color));
  const free = COLORS.find((c) => !used.has(c));
  if (mine && free && free !== mine.color) await supabase.from("family_members").update({ color: free }).eq("id", mine.id);
  revalidatePath("/", "layout");
}

export async function updateHouseholdName(name: string): Promise<void> {
  const supabase = await createClient();
  const clean = name.trim();
  if (!clean) throw new Error("El hogar necesita un nombre.");
  const { data } = await supabase.from("households").select("id").limit(1).maybeSingle();
  if (!data) throw new Error("No encontramos tu hogar.");
  const { error } = await supabase.from("households").update({ name: clean }).eq("id", data.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

async function mergeSettings(patch: (current: HouseholdSettings) => HouseholdSettings) {
  const supabase = await createClient();
  const { data } = await supabase.from("households").select("id, settings").limit(1).maybeSingle();
  if (!data) throw new Error("No encontramos tu hogar.");
  const next = patch((data.settings ?? {}) as HouseholdSettings);
  const { error } = await supabase.from("households").update({ settings: next }).eq("id", data.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function setModuleEnabled(key: string, enabled: boolean): Promise<void> {
  await mergeSettings((s) => ({ ...s, modules: { ...(s.modules ?? {}), [key]: enabled } }));
}



export async function regenerateInviteCode(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_invite_code");
  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
  return data as string;
}

// Qué ver cada mañana en Hoy: tradición (o ninguna) y horóscopo.
export async function setInspiration(input: { tradition: Tradition; horoscope: boolean; otherLabel?: string }): Promise<void> {
  await mergeSettings((s) => ({
    ...s,
    inspiration: {
      ...(s.inspiration ?? {}),
      tradition: input.tradition,
      horoscope: input.horoscope,
      gospel: input.tradition !== "ninguna" && input.tradition !== "otra",
      otherLabel: input.tradition === "otra" ? input.otherLabel?.trim() || s.inspiration?.otherLabel : s.inspiration?.otherLabel,
    },
  }));
}

// Guarda qué religión pidieron que sumemos (no la tenemos todavía) y deja "Sin religión" mientras tanto.
// Elegir "Sin religión sin más" no manda nada acá: esto es solo para el caso "mi religión no está".
export async function requestTradition(input: { label: string; note: string | null; horoscope: boolean }): Promise<void> {
  const supabase = await createClient();
  const label = input.label.trim();
  if (!label) throw new Error("Contanos cuál es tu religión, así queda anotado.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: household } = await supabase.from("households").select("id").limit(1).maybeSingle();
  const { error } = await supabase.from("tradition_requests").insert({
    household_id: household?.id ?? null,
    user_id: user?.id ?? null,
    label,
    note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  await setInspiration({ tradition: "otra", horoscope: input.horoscope, otherLabel: label });
}
