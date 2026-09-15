"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateMyLocation(memberId: string, lat: number, lng: number, accuracy: number | null) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Solo se puede actualizar la ubicación del propio perfil, y solo si está compartiendo.
  const { data: member } = await supabase
    .from("family_members")
    .select("id, share_location")
    .eq("id", memberId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member?.share_location) return;

  await supabase.from("locations").upsert(
    { member_id: memberId, lat, lng, accuracy, updated_at: new Date().toISOString() },
    { onConflict: "member_id" }
  );
}
