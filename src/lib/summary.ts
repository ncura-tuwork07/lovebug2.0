import type { Expense, Income, Member, Project, Reminder, Trip, ImportantDate } from "@/lib/types";
import { addDays, formatARS, formatDay, shortTime } from "@/lib/format";
import { upcomingDates } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/labels";

export type WeeklyInput = {
  today: string;
  members: Member[];
  expensesThisWeek: Expense[];
  expensesLastWeek: Expense[];
  incomesThisWeek: Income[];
  projects: Project[];
  tripsNextWeek: Trip[];
  reminders: Reminder[];
  dates: ImportantDate[];
};

export type WeeklySummary = { title: string; lines: string[]; text: string };

const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + Number(x.amount), 0);

// Resumen determinístico (sin IA): compara la semana con la anterior y mira lo que viene.
export function buildWeeklySummary(i: WeeklyInput): WeeklySummary {
  const lines: string[] = [];

  // Plata
  const thisW = sum(i.expensesThisWeek);
  const lastW = sum(i.expensesLastWeek);
  if (thisW > 0 || lastW > 0) {
    let s = `Gastaron ${formatARS(thisW)} esta semana`;
    if (lastW > 0) {
      const pct = Math.round(((thisW - lastW) / lastW) * 100);
      s += pct === 0 ? ", igual que la anterior" : pct > 0 ? `, ${pct}% más que la anterior` : `, ${-pct}% menos que la anterior`;
    }
    const byCat = new Map<string, number>();
    for (const e of i.expensesThisWeek) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) s += `. Lo que más pesó: ${EXPENSE_CATEGORIES[top[0] as keyof typeof EXPENSE_CATEGORIES] ?? top[0]} (${formatARS(top[1])})`;
    lines.push(s + ".");
  }
  const inc = sum(i.incomesThisWeek);
  if (inc > 0) lines.push(`Entraron ${formatARS(inc)}.`);

  // Metas
  const overdue = i.projects.filter((p) => p.status !== "done" && p.due_date && p.due_date < i.today);
  const doneThisWeek = i.projects.filter((p) => p.status === "done");
  if (overdue.length) lines.push(`${overdue.length} meta${overdue.length === 1 ? " vencida" : "s vencidas"}: ${overdue.slice(0, 3).map((p) => p.title).join(", ")}.`);
  if (doneThisWeek.length) lines.push(`${doneThisWeek.length} meta${doneThisWeek.length === 1 ? "" : "s"} tachada${doneThisWeek.length === 1 ? "" : "s"}. 💪`);

  // Logística de la semana que viene: choques (dos traslados a la misma hora)
  const byDayHour = new Map<string, Trip[]>();
  for (const t of i.tripsNextWeek) {
    if (!t.departure_time) continue;
    const k = `${t.trip_date} ${shortTime(t.departure_time)}`;
    byDayHour.set(k, [...(byDayHour.get(k) ?? []), t]);
  }
  const clashes = [...byDayHour.entries()].filter(([, ts]) => ts.length > 1);
  if (clashes.length) {
    const [k, ts] = clashes[0];
    const [day, hour] = k.split(" ");
    lines.push(`Ojo: el ${formatDay(day, "EEEE")} a las ${hour} hay ${ts.length} traslados a la vez (${ts.map((t) => t.destination).join(" y ")}).`);
  } else if (i.tripsNextWeek.length) {
    lines.push(`Semana que viene: ${i.tripsNextWeek.length} traslado${i.tripsNextWeek.length === 1 ? "" : "s"} cargado${i.tripsNextWeek.length === 1 ? "" : "s"}.`);
  }

  // Vencimientos y fechas próximas
  const in7 = addDays(i.today, 7);
  const due = i.reminders.filter((r) => !r.done && r.due_date >= i.today && r.due_date <= in7);
  if (due.length) lines.push(`Vence${due.length === 1 ? "" : "n"} esta semana: ${due.map((r) => `${r.title} (${formatDay(r.due_date, "EEE d")})`).join(", ")}.`);
  const dates = upcomingDates(i.today, i.dates, i.members).filter((d) => d.daysUntil <= 7);
  if (dates.length) lines.push(`Fechas: ${dates.map((d) => `${d.title} ${d.daysUntil === 0 ? "hoy" : `el ${formatDay(d.next, "EEE d")}`}`).join(", ")}. 🎁`);

  if (lines.length === 0) lines.push("Semana tranquila: sin gastos ni pendientes cargados. Aprovechen.");

  return { title: "Resumen de la semana", lines, text: lines.join(" ") };
}
