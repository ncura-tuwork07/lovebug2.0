"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { cleanRoom, placeRooms, type RoomDraft } from "@/lib/home";

export type RoomInput = RoomDraft & { id?: string };

export async function saveRoom(input: RoomInput): Promise<void> {
  const room = cleanRoom(input);
  if (!room) throw new Error("Ponele un nombre al ambiente.");
  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from("home_rooms").update(room).eq("id", input.id)
    : await supabase.from("home_rooms").insert(room);
  if (error) throw new Error(error.message);
  revalidatePath("/casa");
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("home_rooms").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/casa");
}

// Reemplaza el plano entero (lo que armó la IA y la persona aprobó). Los que estaban marcados en
// un ambiente quedan "sin marcar" (la base pone room_id en null al borrarlo).
export async function replaceRooms(rawRooms: RoomDraft[]): Promise<void> {
  const rooms = placeRooms(rawRooms);
  if (!rooms.length) throw new Error("El plano vino vacío.");

  const supabase = await createClient();
  const { error: delErr } = await supabase.from("home_rooms").delete().not("id", "is", null); // RLS: solo las del hogar
  if (delErr) throw new Error(delErr.message);
  const { error } = await supabase.from("home_rooms").insert(rooms);
  if (error) throw new Error(error.message);
  revalidatePath("/casa");
}

// "Estoy en la cocina": lo marca cada uno, o alguien por los chicos. roomId null = salió de casa.
export async function setPresence(memberId: string, roomId: string | null): Promise<void> {
  const { members } = await getSessionContext();
  if (!members.some((m) => m.id === memberId)) throw new Error("Esa persona no es de tu hogar.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("home_presence")
    .upsert({ member_id: memberId, room_id: roomId, updated_at: new Date().toISOString() }, { onConflict: "member_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/casa");
}
