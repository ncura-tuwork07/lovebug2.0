import Link from "next/link";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { addMonths, monthRange, todayAR } from "@/lib/format";
import type { Budget, Expense, Income, SavingsGoal } from "@/lib/types";
import { FinanceView } from "@/components/modules/FinanceView";
import type { BillRow } from "@/components/modules/RecurringBills";

export const dynamic = "force-dynamic";

export default async function FinanzasPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const supabase = await createClient();
  const today = todayAR();
  // "m" es el primer día de cualquier mes (?m=2026-10-01): así se puede mirar/planear otros meses.
  const viewDate = m && /^\d{4}-\d{2}-\d{2}$/.test(m) ? m : today;
  const { from, to } = monthRange(viewDate);
  const isFuture = from > today;
  const isPast = to < today;

  const [{ members, me }, incomesRes, expensesRes, goalsRes, budgetsRes, eventsRes, remindersRes, cyclesRes] = await Promise.all([
    getSessionContext(),
    supabase.from("incomes").select("*").gte("received_at", from).lte("received_at", to).order("received_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("expenses").select("*").gte("spent_at", from).lte("spent_at", to).order("spent_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("savings_goals").select("*").order("created_at"),
    supabase.from("budgets").select("*").order("category"),
    supabase.from("family_events").select("id, title").eq("status", "planning").order("event_date"),
    // Si tiene fecha de fin ("hasta junio del año que viene"), deja de listarse pasado ese mes.
    supabase.from("reminders").select("*").eq("repeat", "monthly").or(`repeat_until.is.null,repeat_until.gte.${from}`).order("title"),
    supabase.from("bill_cycles").select("*").eq("month", from),
  ]);
  const monthLabel = new Date(`${from}T12:00:00-03:00`).toLocaleDateString("es-AR", {
    month: "long",
    year: from.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const cyclesByReminder = new Map((cyclesRes.data ?? []).map((c) => [c.reminder_id, c]));
  const bills: BillRow[] = (remindersRes.data ?? []).map((reminder) => ({ reminder, cycle: cyclesByReminder.get(reminder.id) ?? null }));

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="lb-tint text-sm" style={{ "--tint": "var(--color-ariana)" } as CSSProperties}>
          Nuestra plata
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Finanzas</h1>
      </header>
      <MonthNav from={from} today={today} monthLabel={monthLabel} />
      <FinanceView
        key={from}
        incomes={(incomesRes.data ?? []) as Income[]}
        expenses={(expensesRes.data ?? []) as Expense[]}
        goals={(goalsRes.data ?? []) as SavingsGoal[]}
        budgets={(budgetsRes.data ?? []) as Budget[]}
        events={eventsRes.data ?? []}
        members={members}
        currentMemberId={me?.id ?? null}
        monthLabel={monthLabel}
        month={from}
        isFuture={isFuture}
        isPast={isPast}
        bills={bills}
      />
    </div>
  );
}

// Cada mes es como una carpeta aparte: cuentas, ingresos y gastos se cargan por separado.
// Con estas flechas se avanza a planear meses futuros o se mira para atrás.
function MonthNav({ from, today, monthLabel }: { from: string; today: string; monthLabel: string }) {
  const prev = addMonths(from, -1);
  const next = addMonths(from, 1);
  const isCurrent = from === monthRange(today).from;
  return (
    <div className="flex items-center justify-between gap-2 rounded-full bg-surface px-2 py-1.5 shadow-soft">
      <Link href={`/finanzas?m=${prev}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-ink-faint hover:bg-line/60" aria-label="Mes anterior">
        ‹
      </Link>
      <span className="flex items-baseline gap-1.5 font-display font-bold capitalize text-ink">
        {monthLabel}
        {!isCurrent && (
          <Link href="/finanzas" className="text-meta font-semibold normal-case text-coral">
            hoy
          </Link>
        )}
      </span>
      <Link href={`/finanzas?m=${next}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-ink-faint hover:bg-line/60" aria-label="Mes siguiente">
        ›
      </Link>
    </div>
  );
}
