import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data";
import type { PointsEntry, Reward } from "@/lib/types";
import { PointsView } from "@/components/modules/PointsView";

export const dynamic = "force-dynamic";

export default async function PuntosPage() {
  const supabase = await createClient();
  const [members, ledgerRes, rewardsRes] = await Promise.all([
    getMembers(),
    supabase.from("points_ledger").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("rewards").select("*").eq("active", true).order("cost"),
  ]);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-success">Tareas que valen</p>
        <h1 className="text-h1 font-display font-bold text-ink">Puntos y premios</h1>
      </header>
      <PointsView members={members} ledger={(ledgerRes.data ?? []) as PointsEntry[]} rewards={(rewardsRes.data ?? []) as Reward[]} />
    </div>
  );
}
