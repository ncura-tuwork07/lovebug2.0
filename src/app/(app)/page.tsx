import { Suspense } from "react";
import Link from "next/link";
import { LadybugLoader } from "@/components/ui/LadybugLoader";
import { BellRing, CalendarHeart, CarFront, ChefHat, ChevronRight, ClipboardList, MapPin, PartyPopper, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { addDays, formatARS, formatDay, todayAR } from "@/lib/format";
import { daysUntilLabel, upcomingDates } from "@/lib/dates";
import { computeWeeklySummary } from "@/lib/notify";
import type { CalendarEvent, FamilyEvent, ImportantDate, MealPlan, Reminder, Task, Trip } from "@/lib/types";
import { TasksList } from "@/components/modules/TasksList";
import { TripsList } from "@/components/modules/TripsList";
import { EventsList } from "@/components/modules/EventsList";
import { DailyInspiration } from "@/components/DailyInspiration";
import { Contale } from "@/components/assistant/Contale";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const supabase = await createClient();
  const today = todayAR();
  const tomorrow = addDays(today, 1);
  const in7 = addDays(today, 7);
  const dow = new Date(`${today}T12:00:00-03:00`).getUTCDay(); // 0 = domingo

  const [{ members, me, household }, tasksRes, tripsRes, eventsRes, remRes, datesRes, mealsRes, shopRes, famRes, summary] = await Promise.all([
    getSessionContext(),
    supabase.from("daily_tasks").select("*").lte("due_date", today).order("done").order("created_at"),
    supabase.from("logistics_trips").select("*").eq("trip_date", today).order("departure_time", { nullsFirst: false }),
    supabase
      .from("calendar_events")
      .select("*")
      .gte("starts_at", `${today}T00:00:00-03:00`)
      .lt("starts_at", `${tomorrow}T00:00:00-03:00`)
      .order("starts_at"),
    supabase.from("reminders").select("*").eq("done", false).lte("due_date", in7).order("due_date"),
    supabase.from("important_dates").select("*"),
    supabase.from("meal_plans").select("*").eq("day", today),
    supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("checked", false),
    supabase.from("family_events").select("id, title, event_date, guests").eq("status", "planning").gte("event_date", today).lte("event_date", addDays(today, 30)).order("event_date"),
    dow === 0 || dow === 1 ? computeWeeklySummary(supabase, today) : null,
  ]);
  const on = (key: string) => isModuleEnabled(household?.settings, key);

  const tasks = (tasksRes.data ?? []) as Task[];
  const trips = (tripsRes.data ?? []) as Trip[];
  const events = (eventsRes.data ?? []) as CalendarEvent[];
  const reminders = (remRes.data ?? []) as Reminder[];
  const dates = upcomingDates(today, (datesRes.data ?? []) as ImportantDate[], members).filter((d) => d.daysUntil <= 14);
  const meals = (mealsRes.data ?? []) as MealPlan[];
  const pendingShopping = shopRes.count ?? 0;
  const famEvents = (famRes.data ?? []) as Pick<FamilyEvent, "id" | "title" | "event_date" | "guests">[];

  const heading = new Date(`${today}T12:00:00-03:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-amber">{me ? `Buen día, ${me.nickname ?? me.name} ☀️` : "Hoy es"}</p>
        <h1 className="text-display font-display font-bold capitalize text-ink">{heading}</h1>
      </header>

      {process.env.ANTHROPIC_API_KEY && <Contale members={members} today={today} />}

      {/* Accesos rápidos */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {on("compras") && <Quick href="/compras" icon={ShoppingCart} color="#FF9F43" label={pendingShopping ? `Compras · ${pendingShopping}` : "Compras"} />}
        {on("mapa") && <Quick href="/mapa" icon={MapPin} color="#3B82F6" label="Mapa" />}
        {on("menu") && <Quick href="/menu" icon={ChefHat} color="#0EA5A5" label={meals.length ? `Hoy: ${meals.map((m) => m.title).join(" / ")}` : "Menú"} />}
        {on("vencimientos") && <Quick href="/vencimientos" icon={BellRing} color="#F59E0B" label="Vencimientos" />}
        {on("eventos") && <Quick href="/eventos" icon={PartyPopper} color="#FF5A5F" label="Eventos" />}
      </div>

      {summary && (
        <section className="lb-card !bg-amber-soft">
          <h2 className="text-h2 mb-2 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
            <ClipboardList size={16} /> {summary.title}
          </h2>
          <ul className="flex flex-col gap-1.5 text-body text-ink">
            {summary.lines.map((l, i) => (
              <li key={i}>• {l}</li>
            ))}
          </ul>
        </section>
      )}

      <TasksList tasks={tasks} members={members} currentMemberId={me?.id ?? null} date={today} />

      {on("logistica") && (
      <section className="lb-card">
        <Link href="/logistica" className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide text-success">
            <CarFront size={16} /> Logística de hoy
          </h2>
          <ChevronRight size={16} className="text-ink-ghost" />
        </Link>
        <TripsList trips={trips} members={members} currentMemberId={me?.id ?? null} compact />
      </section>
      )}

      <section className="lb-card">
        <Link href="/calendario" className="mb-3 flex items-center justify-between">
          <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide text-info">
            <CalendarHeart size={16} /> En el calendario
          </h2>
          <ChevronRight size={16} className="text-ink-ghost" />
        </Link>
        <EventsList events={events} members={members} compact />
      </section>

      {(reminders.length > 0 || dates.length > 0 || famEvents.length > 0) && (
        <section className="lb-card">
          <Link href="/calendario" className="mb-3 flex items-center justify-between">
            <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide" style={{ color: "#F59E0B" }}>
              <BellRing size={16} /> Se viene
            </h2>
            <ChevronRight size={16} className="text-ink-ghost" />
          </Link>
          <ul className="flex flex-col gap-2 text-item">
            {reminders.map((r) => {
              const days = Math.round((Date.parse(r.due_date) - Date.parse(today)) / 86400000);
              return (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink">
                    {r.title}
                    {r.amount ? <span className="text-meta text-ink-faint"> · {formatARS(Number(r.amount))}</span> : null}
                  </span>
                  <span className={`shrink-0 text-sm font-semibold ${days <= 0 ? "text-danger" : "text-amber"}`}>
                    {days < 0 ? "Vencido" : days === 0 ? "Hoy" : formatDay(r.due_date, "EEE d")}
                  </span>
                </li>
              );
            })}
            {famEvents.map((ev) => {
              const d = Math.round((Date.parse(ev.event_date) - Date.parse(today)) / 86400000);
              return (
                <li key={ev.id} className="flex items-center justify-between gap-2">
                  <Link href={`/eventos/${ev.id}`} className="text-ink">
                    🎉 {ev.title}
                    {ev.guests ? <span className="text-meta text-ink-faint"> · {ev.guests} inv.</span> : null}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold text-coral">{daysUntilLabel(d)}</span>
                </li>
              );
            })}
            {dates.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="text-ink">🎂 {d.title}</span>
                <span className="shrink-0 text-sm font-semibold text-coral">{daysUntilLabel(d.daysUntil)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Aparte (streaming): si la inspiración tarda, el resto de Hoy ya está en pantalla. */}
      <Suspense fallback={<LadybugLoader label="Buscando la inspiración de hoy…" className="py-6" />}>
        <DailyInspiration members={members} settings={household?.settings ?? null} />
      </Suspense>
    </div>
  );
}

function Quick({ href, icon: Icon, color, label }: { href: string; icon: typeof MapPin; color: string; label: string }) {
  return (
    <Link href={href} className="lb-card flex shrink-0 items-center gap-2 !px-3 !py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
        <Icon size={14} />
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-ink">{label}</span>
    </Link>
  );
}
