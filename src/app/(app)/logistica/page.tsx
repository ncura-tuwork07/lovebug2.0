import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { addDays, todayAR } from "@/lib/format";
import type { Trip } from "@/lib/types";
import { TripsList } from "@/components/modules/TripsList";

export const dynamic = "force-dynamic";

export default async function LogisticaPage() {
  const supabase = await createClient();
  const today = todayAR();

  const [{ members, me }, { data }] = await Promise.all([
    getSessionContext(),
    supabase
      .from("logistics_trips")
      .select("*")
      .gte("trip_date", addDays(today, -1))
      .lte("trip_date", addDays(today, 60))
      .order("trip_date")
      .order("departure_time", { nullsFirst: false }),
  ]);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-success">Quién lleva a quién</p>
        <h1 className="text-h1 font-display font-bold text-ink">Logística</h1>
      </header>
      <TripsList trips={(data ?? []) as Trip[]} members={members} currentMemberId={me?.id ?? null} />
    </div>
  );
}
