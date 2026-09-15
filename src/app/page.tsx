import Link from "next/link";
import { CalendarHeart, CarFront, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import { addDays, todayAR } from "@/lib/format";
import type { CalendarEvent, Task, Trip } from "@/lib/types";
import { TasksList } from "@/components/modules/TasksList";
import { TripsList } from "@/components/modules/TripsList";
import { EventsList } from "@/components/modules/EventsList";
import { DailyInspiration } from "@/components/DailyInspiration";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const supabase = await createClient();
  const today = todayAR();
  const tomorrow = addDays(today, 1);

  const [members, tasksRes, tripsRes, eventsRes] = await Promise.all([
    getMembers(),
    supabase.from("daily_tasks").select("*").lte("due_date", today).order("done").order("created_at"),
    supabase.from("logistics_trips").select("*").eq("trip_date", today).order("departure_time", { nullsFirst: false }),
    supabase
      .from("calendar_events")
      .select("*")
      .gte("starts_at", `${today}T00:00:00-03:00`)
      .lt("starts_at", `${tomorrow}T00:00:00-03:00`)
      .order("starts_at"),
  ]);
  const me = await getCurrentMember(members);

  const tasks = (tasksRes.data ?? []) as Task[];
  const trips = (tripsRes.data ?? []) as Trip[];
  const events = (eventsRes.data ?? []) as CalendarEvent[];

  const heading = new Date(`${today}T12:00:00-03:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-amber">{me ? `Buen día, ${me.name} ☀️` : "Hoy es"}</p>
        <h1 className="text-display font-display font-bold capitalize text-ink">{heading}</h1>
      </header>

      <TasksList tasks={tasks} members={members} currentMemberId={me?.id ?? null} date={today} />

      <section className="lb-card">
        <Link href="/logistica" className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide text-success">
            <CarFront size={16} /> Logística de hoy
          </h2>
          <ChevronRight size={16} className="text-ink-ghost" />
        </Link>
        <TripsList trips={trips} members={members} currentMemberId={me?.id ?? null} compact />
      </section>

      <section className="lb-card">
        <Link href="/calendario" className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide text-info">
            <CalendarHeart size={16} /> En el calendario
          </h2>
          <ChevronRight size={16} className="text-ink-ghost" />
        </Link>
        <EventsList events={events} members={members} compact />
      </section>

      <DailyInspiration />
    </div>
  );
}
