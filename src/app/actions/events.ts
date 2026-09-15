"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EventCategory } from "@/lib/types";

export type EventInput = {
  id?: string;
  title: string;
  category: EventCategory;
  member_id: string | null;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
};

// Fecha + hora local de Argentina → ISO con offset (-03:00, sin horario de verano).
function toIso(date: string, time: string | null) {
  return `${date}T${time ?? "00:00"}:00-03:00`;
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/calendario");
}

export async function saveEvent(input: EventInput) {
  const supabase = await createClient();
  const allDay = input.all_day || !input.start_time;
  const row = {
    title: input.title.trim(),
    category: input.category,
    member_id: input.member_id || null,
    starts_at: toIso(input.date, allDay ? null : input.start_time),
    ends_at: !allDay && input.end_time ? toIso(input.date, input.end_time) : null,
    all_day: allDay,
    location: input.location?.trim() || null,
    notes: input.notes?.trim() || null,
  };
  if (!row.title) throw new Error("Falta el título.");

  const { error } = input.id
    ? await supabase.from("calendar_events").update(row).eq("id", input.id)
    : await supabase.from("calendar_events").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
