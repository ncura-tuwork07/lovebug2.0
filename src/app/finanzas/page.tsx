import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import { monthRange, todayAR } from "@/lib/format";
import type { Budget, Expense, Income, SavingsGoal } from "@/lib/types";
import { FinanceView } from "@/components/modules/FinanceView";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const supabase = await createClient();
  const today = todayAR();
  const { from, to } = monthRange(today);

  const [members, incomesRes, expensesRes, goalsRes, budgetsRes] = await Promise.all([
    getMembers(),
    supabase.from("incomes").select("*").gte("received_at", from).lte("received_at", to).order("received_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").gte("spent_at", from).lte("spent_at", to).order("spent_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("savings_goals").select("*").order("created_at"),
    supabase.from("budgets").select("*").order("category"),
  ]);
  const me = await getCurrentMember(members);

  const monthLabel = new Date(`${today}T12:00:00-03:00`).toLocaleDateString("es-AR", {
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "var(--color-ariana)" }}>
          Nuestra plata
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Finanzas</h1>
      </header>
      <FinanceView
        incomes={(incomesRes.data ?? []) as Income[]}
        expenses={(expensesRes.data ?? []) as Expense[]}
        goals={(goalsRes.data ?? []) as SavingsGoal[]}
        budgets={(budgetsRes.data ?? []) as Budget[]}
        members={members}
        currentMemberId={me?.id ?? null}
        monthLabel={monthLabel}
      />
    </div>
  );
}
