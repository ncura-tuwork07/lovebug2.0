import { createClient } from "@/lib/supabase/server";
import type { FamilyEvent } from "@/lib/types";
import { EventsHub } from "@/components/modules/EventsHub";

export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("family_events").select("*").order("event_date");

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-coral">Cumples, asados, celebraciones</p>
        <h1 className="text-h1 font-display font-bold text-ink">Eventos</h1>
      </header>
      <EventsHub events={(data ?? []) as FamilyEvent[]} />
    </div>
  );
}
