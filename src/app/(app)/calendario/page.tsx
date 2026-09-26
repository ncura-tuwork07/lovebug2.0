import { createClient } from "@/lib/supabase/server";
import { getContacts, getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { upcomingDates } from "@/lib/dates";
import { addDays, formatARS, todayAR } from "@/lib/format";
import type { CalendarEvent, ImportantDate, Reminder } from "@/lib/types";
import type { AgendaExtra } from "@/components/modules/EventsList";
import { CalendarView } from "@/components/modules/CalendarView";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 120;

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient();
  const today = todayAR();
  const until = addDays(today, WINDOW_DAYS);
  const [{ tab }, { members, household }] = await Promise.all([searchParams, getSessionContext()]);
  const on = (key: string) => isModuleEnabled(household?.settings, key);
  const none = Promise.resolve({ data: null });

  const [eventsRes, datesRes, remindersRes, contacts] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*")
      .gte("starts_at", `${addDays(today, -1)}T00:00:00-03:00`)
      .lte("starts_at", `${until}T23:59:59-03:00`)
      .order("starts_at"),
    supabase.from("important_dates").select("*"),
    on("vencimientos")
      ? supabase.from("reminders").select("id, title, due_date, amount, member_id").eq("done", false).gte("due_date", today).lte("due_date", until).order("due_date")
      : none,
    on("circulo") ? getContacts().catch(() => []) : Promise.resolve([]),
  ]);

  const dates = (datesRes.data ?? []) as ImportantDate[];
  const upcoming = upcomingDates(today, dates, members, contacts);

  // Cumples, aniversarios y vencimientos entran en la agenda del día que les toca.
  const extras: AgendaExtra[] = [
    ...upcoming
      .filter((u) => u.daysUntil <= WINDOW_DAYS)
      .map((u) => ({
        id: `date-${u.id}`,
        day: u.next,
        kind: u.kind,
        title: u.title,
        detail: u.turns != null && u.kind !== "otro" ? `${u.turns} ${u.kind === "cumple" ? "años" : "años juntos"}` : null,
        member_id: u.member_id,
        href: null,
      })),
    ...((remindersRes.data ?? []) as Pick<Reminder, "id" | "title" | "due_date" | "amount" | "member_id">[]).map((r) => ({
      id: `rem-${r.id}`,
      day: r.due_date,
      kind: "vence" as const,
      title: r.title,
      detail: r.amount != null ? formatARS(Number(r.amount)) : null,
      member_id: r.member_id,
      href: "/vencimientos",
    })),
  ];

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-info">Lo que viene</p>
        <h1 className="text-h1 font-display font-bold text-ink">Calendario</h1>
      </header>
      <CalendarView
        events={(eventsRes.data ?? []) as CalendarEvent[]}
        extras={extras}
        upcoming={upcoming}
        dates={dates}
        members={members}
        initialTab={tab === "fechas" ? "fechas" : "agenda"}
      />
    </div>
  );
}
