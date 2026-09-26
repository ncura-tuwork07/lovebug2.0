"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/app";
import { feedToken, feedVersion } from "@/lib/calendarFeed";
import type { HouseholdSettings } from "@/lib/types";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : APP_URL;
}

// El link para suscribirse (lo ve cualquiera del hogar: es el calendario de todos).
export async function getCalendarFeedUrl(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("households").select("id, settings").limit(1).maybeSingle();
  if (!data) return null;
  const token = feedToken(data.id as string, feedVersion(data.settings as HouseholdSettings));
  return token ? `${await origin()}/api/calendario/${token}.ics` : null;
}

// Link nuevo: el anterior deja de funcionar (por si se compartió de más).
export async function rotateCalendarFeed(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("households").select("id, settings").limit(1).maybeSingle();
  if (!data) throw new Error("No encontramos tu hogar.");
  const settings = (data.settings ?? {}) as HouseholdSettings;
  const next = { ...settings, calendarFeed: { version: feedVersion(settings) + 1 } };
  const { error } = await supabase.from("households").update({ settings: next }).eq("id", data.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return getCalendarFeedUrl();
}
