"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { HouseholdSettings, Tradition } from "@/lib/types";

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
