import { parseISO, startOfWeek, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import { addDays, todayAR } from "@/lib/format";
import type { MealPlan } from "@/lib/types";
import { MealPlanner } from "@/components/modules/MealPlanner";

export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const base = w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : todayAR();
  const weekStart = format(startOfWeek(parseISO(base), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const supabase = await createClient();
  const [members, { data }] = await Promise.all([
    getMembers(),
    supabase.from("meal_plans").select("*").gte("day", weekStart).lte("day", addDays(weekStart, 6)),
  ]);
  const me = await getCurrentMember(members);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "#0EA5A5" }}>
          Qué comemos esta semana
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Menú semanal</h1>
      </header>
      <MealPlanner weekStart={weekStart} meals={(data ?? []) as MealPlan[]} currentMemberId={me?.id ?? null} />
    </div>
  );
}
