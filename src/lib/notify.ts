import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastPush, type PushPayload } from "@/lib/push";
import { buildWeeklySummary } from "@/lib/summary";
import { ensureDailyContent } from "@/lib/daily";
import { addDays, formatARS, monthRange, shortTime, todayAR, TZ } from "@/lib/format";
import { upcomingDates } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/labels";
import type { Expense, ImportantDate, Income, Member, Project, Reminder, Trip } from "@/lib/types";

type Job = "hourly" | "daily" | "weekly";

// Evita mandar dos veces el mismo aviso (el cron puede correr más de una vez). Clave por hogar.
async function once(admin: SupabaseClient, householdId: string, key: string, payload: PushPayload) {
  const fullKey = `${householdId.slice(0, 8)}:${key}`;
  const { data } = await admin.from("notifications_log").select("key").eq("key", fullKey).maybeSingle();
  if (data) return 0;
  const sent = await broadcastPush(payload, { householdId });
  await admin.from("notifications_log").insert({ key: fullKey });
  return sent;
}

function nowMinutesAR(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Corre el trabajo para cada hogar por separado: cada uno recibe solo sus avisos.
export async function runJob(job: Job): Promise<{ sent: number; notes: string[] }> {
  const admin = createAdminClient();
  if (!admin) return { sent: 0, notes: ["sin SUPABASE_SERVICE_ROLE_KEY"] };
  // A la mañana dejamos lista la inspiración del día (Evangelio + Claude), para que nadie la espere en Hoy.
  const daily = job === "daily" ? ensureDailyContent(todayAR()) : null;
  const { data: households } = await admin.from("households").select("id, name");
  let sent = 0;
  const notes: string[] = [];
  for (const h of households ?? []) {
    const r = await runJobForHousehold(admin, job, h.id);
    sent += r.sent;
    notes.push(`${h.name}: ${r.notes.join(", ")}`);
  }
  if (daily) await daily;
  return { sent, notes };
}

async function runJobForHousehold(admin: SupabaseClient, job: Job, householdId: string): Promise<{ sent: number; notes: string[] }> {
  const today = todayAR();
  const notes: string[] = [];
  let sent = 0;
  const hh = householdId;

  const { data: members } = await admin.from("family_members").select("*").eq("household_id", hh);
  const name = (id: string | null) => (members ?? []).find((m: Member) => m.id === id)?.name ?? null;

  if (job === "hourly") {
    // Traslados que salen dentro de 45–105 minutos → "En 1 hora sale …"
    const now = nowMinutesAR();
    const { data: trips } = await admin.from("logistics_trips").select("*").eq("household_id", hh).eq("trip_date", today).eq("done", false);
    for (const t of (trips ?? []) as Trip[]) {
      if (!t.departure_time) continue;
      const diff = toMinutes(t.departure_time) - now;
      if (diff < 45 || diff > 105) continue;
      const who = name(t.member_id);
      const driver = name(t.driver_id);
      sent += await once(admin, hh, `trip:${t.id}:${today}`, {
        title: `En 1 hora sale ${who ?? "alguien"} 🚗`,
        body: `${who ? `${who} → ` : ""}${t.destination} a las ${shortTime(t.departure_time)}${driver ? ` · lleva ${driver}` : ""}`,
        url: "/logistica",
        tag: `trip-${t.id}`,
      });
    }
    notes.push(`traslados revisados: ${trips?.length ?? 0}`);
  }

  if (job === "daily") {
    // Vencimientos que entran en su ventana de aviso
    const { data: reminders } = await admin.from("reminders").select("*").eq("household_id", hh).eq("done", false);
    for (const r of (reminders ?? []) as Reminder[]) {
      const days = Math.round((Date.parse(r.due_date) - Date.parse(today)) / 86400000);
      if (days > r.notify_days_before) continue;
      if (days < -3) continue;
      const when = days < 0 ? `venció hace ${-days} día${-days === 1 ? "" : "s"}` : days === 0 ? "vence hoy" : `vence en ${days} día${days === 1 ? "" : "s"}`;
      sent += await once(admin, hh, `reminder:${r.id}:${today}`, {
        title: `${r.title} ${when} ${days <= 0 ? "⚠️" : "🔔"}`,
        body: `${r.amount ? formatARS(Number(r.amount)) + " · " : ""}${name(r.member_id) ? `Responsable: ${name(r.member_id)}` : "Vencimientos"}`,
        url: "/vencimientos",
        tag: `reminder-${r.id}`,
      });
    }

    // Fechas importantes (cumples, aniversario) dentro de su ventana
    const { data: dates } = await admin.from("important_dates").select("*").eq("household_id", hh);
    const upcoming = upcomingDates(today, (dates ?? []) as ImportantDate[], (members ?? []) as Member[]);
    for (const d of upcoming) {
      if (d.daysUntil > d.remind_days_before) continue;
      if (![0, 1, 3, 7, 14, 30].includes(d.daysUntil) && d.daysUntil !== d.remind_days_before) continue;
      sent += await once(admin, hh, `date:${d.id}:${d.next}:${d.daysUntil}`, {
        title: d.daysUntil === 0 ? `¡Hoy es ${d.title}! 🎉` : `${d.title} en ${d.daysUntil} día${d.daysUntil === 1 ? "" : "s"} 🎁`,
        body: d.gift_ideas ? `Ideas de regalo: ${d.gift_ideas}` : d.turns ? `Cumple ${d.turns}` : "Para que no se pase.",
        url: "/calendario?tab=fechas",
        tag: `date-${d.id}`,
      });
    }

    // Presupuestos al 90% o pasados
    const { from, to } = monthRange(today);
    const [{ data: budgets }, { data: expenses }] = await Promise.all([
      admin.from("budgets").select("*").eq("household_id", hh),
      admin.from("expenses").select("category, amount").eq("household_id", hh).gte("spent_at", from).lte("spent_at", to),
    ]);
    for (const b of budgets ?? []) {
      const spent = (expenses ?? []).filter((e) => e.category === b.category).reduce((s, e) => s + Number(e.amount), 0);
      const pct = Math.round((spent / Number(b.monthly_limit)) * 100);
      if (pct < 90) continue;
      const label = EXPENSE_CATEGORIES[b.category as keyof typeof EXPENSE_CATEGORIES] ?? b.category;
      sent += await once(admin, hh, `budget:${b.category}:${from}:${pct >= 100 ? "over" : "near"}`, {
        title: pct >= 100 ? `Se pasaron del tope en ${label} 🚨` : `${label}: ya van ${pct}% del tope`,
        body: `${formatARS(spent)} de ${formatARS(Number(b.monthly_limit))} este mes.`,
        url: "/finanzas",
        tag: `budget-${b.category}`,
      });
    }
    notes.push(`vencimientos: ${reminders?.length ?? 0}, fechas: ${upcoming.length}, topes: ${budgets?.length ?? 0}`);
  }

  if (job === "weekly") {
    const summary = await computeWeeklySummary(admin, today, hh);
    sent += await once(admin, hh, `weekly:${today}`, {
      title: "Resumen de la semana 📋",
      body: summary.text.slice(0, 220),
      url: "/",
      tag: "weekly",
    });
    notes.push("resumen enviado");
  }

  return { sent, notes };
}

// Con el cliente del usuario, RLS ya filtra por hogar; con service role hay que pasar householdId.
export async function computeWeeklySummary(client: SupabaseClient, today: string, householdId?: string) {
  const weekStart = addDays(today, -6);
  const lastStart = addDays(today, -13);
  const nextEnd = addDays(today, 7);
  const scoped = (table: string) => {
    const q = client.from(table).select("*");
    return householdId ? q.eq("household_id", householdId) : q;
  };
  const [members, e1, e2, inc, proj, trips, rem, dates] = await Promise.all([
    scoped("family_members"),
    scoped("expenses").gte("spent_at", weekStart).lte("spent_at", today),
    scoped("expenses").gte("spent_at", lastStart).lt("spent_at", weekStart),
    scoped("incomes").gte("received_at", weekStart).lte("received_at", today),
    scoped("projects"),
    scoped("logistics_trips").gt("trip_date", today).lte("trip_date", nextEnd),
    scoped("reminders").eq("done", false),
    scoped("important_dates"),
  ]);
  return buildWeeklySummary({
    today,
    members: (members.data ?? []) as Member[],
    expensesThisWeek: (e1.data ?? []) as Expense[],
    expensesLastWeek: (e2.data ?? []) as Expense[],
    incomesThisWeek: (inc.data ?? []) as Income[],
    projects: (proj.data ?? []) as Project[],
    tripsNextWeek: (trips.data ?? []) as Trip[],
    reminders: (rem.data ?? []) as Reminder[],
    dates: (dates.data ?? []) as ImportantDate[],
  });
}
