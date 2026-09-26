"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeletedRows } from "@/app/actions/undo";
import type { Transport } from "@/lib/types";

export type TripInput = {
  id?: string;
  trip_date: string;
  member_id: string | null;
  driver_id: string | null;
  origin: string | null;
  destination: string;
  departure_time: string | null;
  arrival_time: string | null;
  transport: Transport;
  meet_with: string | null;
  notes: string | null;
};

function revalidate() {
  revalidatePath("/");
  revalidatePath("/logistica");
}

export async function saveTrip(input: TripInput) {
  const supabase = await createClient();
  const row = {
    trip_date: input.trip_date,
    member_id: input.member_id || null,
    driver_id: input.driver_id || null,
    origin: input.origin?.trim() || null,
    destination: input.destination.trim(),
    departure_time: input.departure_time || null,
    arrival_time: input.arrival_time || null,
    transport: input.transport,
    meet_with: input.meet_with?.trim() || null,
    notes: input.notes?.trim() || null,
  };
  if (!row.destination) throw new Error("Falta el destino.");

  const { error } = input.id
    ? await supabase.from("logistics_trips").update(row).eq("id", input.id)
    : await supabase.from("logistics_trips").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function toggleTrip(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("logistics_trips").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTrip(id: string): Promise<DeletedRows> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("logistics_trips").delete().eq("id", id).select();
  if (error) throw new Error(error.message);
  revalidate();
  return { table: "logistics_trips", rows: data ?? [] };
}
