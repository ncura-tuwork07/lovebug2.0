import { parseISO, startOfWeek, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import { addDays, todayAR } from "@/lib/format";
import type { MealPlan, PantryItem, Recipe } from "@/lib/types";
import { MealPlanner } from "@/components/modules/MealPlanner";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const base = w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : todayAR();
  const weekStart = format(startOfWeek(parseISO(base), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const supabase = await createClient();
  const [members, mealsRes, recipesRes, pantryRes] = await Promise.all([
    getMembers(),
    supabase.from("meal_plans").select("*").gte("day", weekStart).lte("day", addDays(weekStart, 6)),
    supabase.from("recipes").select("*").order("title"),
    supabase.from("pantry_items").select("*"),
  ]);
  const me = await getCurrentMember(members);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: "#0EA5A5" }}>
            Qué comemos esta semana
          </p>
          <h1 className="text-h1 font-display font-bold text-ink">Menú semanal</h1>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <Link href="/recetas" className="lb-chip min-h-9 border-[1.5px] border-line text-ink-soft">Recetas</Link>
          <Link href="/despensa" className="lb-chip min-h-9 border-[1.5px] border-line text-ink-soft">Despensa</Link>
        </div>
      </header>
      <MealPlanner
        weekStart={weekStart}
        meals={(mealsRes.data ?? []) as MealPlan[]}
        recipes={(recipesRes.data ?? []) as Recipe[]}
        pantry={(pantryRes.data ?? []) as PantryItem[]}
        currentMemberId={me?.id ?? null}
      />
    </div>
  );
}
