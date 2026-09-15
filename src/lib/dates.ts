import type { ImportantDate, Member } from "@/lib/types";

export type Upcoming = {
  id: string;
  title: string;
  kind: "cumple" | "aniversario" | "otro";
  member_id: string | null;
  next: string; // YYYY-MM-DD de la próxima ocurrencia
  daysUntil: number;
  turns: number | null; // años que cumple, si se conoce el año
  remind_days_before: number;
  gift_ideas: string | null;
  source: "date" | "member";
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysBetween(fromIso: string, toIso: string) {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10));
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

function nextOccurrence(today: string, month: number, day: number): string {
  const y = +today.slice(0, 4);
  const candidate = `${y}-${pad(month)}-${pad(day)}`;
  return candidate >= today ? candidate : `${y + 1}-${pad(month)}-${pad(day)}`;
}

// Combina fechas cargadas + cumpleaños de los integrantes, ordenadas por cercanía.
export function upcomingDates(today: string, dates: ImportantDate[], members: Member[]): Upcoming[] {
  const list: Upcoming[] = [];

  for (const d of dates) {
    const next = nextOccurrence(today, d.month, d.day);
    list.push({
      id: d.id,
      title: d.title,
      kind: d.kind,
      member_id: d.member_id,
      next,
      daysUntil: daysBetween(today, next),
      turns: d.year ? +next.slice(0, 4) - d.year : null,
      remind_days_before: d.remind_days_before,
      gift_ideas: d.gift_ideas,
      source: "date",
    });
  }

  for (const m of members) {
    if (!m.birthday) continue;
    const month = +m.birthday.slice(5, 7);
    const day = +m.birthday.slice(8, 10);
    const next = nextOccurrence(today, month, day);
    list.push({
      id: `member-${m.id}`,
      title: `Cumple de ${m.name}`,
      kind: "cumple",
      member_id: m.id,
      next,
      daysUntil: daysBetween(today, next),
      turns: +next.slice(0, 4) - +m.birthday.slice(0, 4),
      remind_days_before: 7,
      gift_ideas: null,
      source: "member",
    });
  }

  return list.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function daysUntilLabel(n: number): string {
  if (n === 0) return "¡Es hoy!";
  if (n === 1) return "Mañana";
  if (n < 7) return `En ${n} días`;
  if (n < 30) {
    const w = Math.max(1, Math.round(n / 7));
    return `En ${w} semana${w === 1 ? "" : "s"}`;
  }
  const m = Math.max(1, Math.round(n / 30));
  return `En ${m} mes${m === 1 ? "" : "es"}`;
}
