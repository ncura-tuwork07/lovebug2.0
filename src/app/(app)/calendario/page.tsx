import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data";
import { addDays, todayAR } from "@/lib/format";
import type { CalendarEvent } from "@/lib/types";
import { EventsList } from "@/components/modules/EventsList";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const today = todayAR();

  const [members, { data }] = await Promise.all([
    getMembers(),
    supabase
      .from("calendar_events")
      .select("*")
      .gte("starts_at", `${addDays(today, -1)}T00:00:00-03:00`)
      .lte("starts_at", `${addDays(today, 120)}T23:59:59-03:00`)
      .order("starts_at"),
  ]);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-info">Lo que viene</p>
        <h1 className="text-h1 font-display font-bold text-ink">Calendario</h1>
      </header>
      <EventsList events={(data ?? []) as CalendarEvent[]} members={members} />
    </div>
  );
}
