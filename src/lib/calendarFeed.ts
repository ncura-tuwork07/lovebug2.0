import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isModuleEnabled } from "@/lib/modules";
import { addDays, formatARS, todayAR, TZ } from "@/lib/format";
import type { HouseholdSettings } from "@/lib/types";

// Suscripción al calendario (Google Calendar, iPhone, Outlook): un link secreto por hogar que
// devuelve un .ics con eventos, traslados, vencimientos y cumples. El link se firma con HMAC (no hay
// tabla): si alguien lo pierde, se sube la versión en households.settings y el viejo deja de andar.

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const sign = (householdId: string, version: number) =>
  createHmac("sha256", secret()!).update(`calendar-feed:${householdId}:${version}`).digest("base64url");

export const feedVersion = (settings: HouseholdSettings | null | undefined) => settings?.calendarFeed?.version ?? 1;

export function feedToken(householdId: string, version: number): string | null {
  if (!secret()) return null;
  return `${householdId}.${version}.${sign(householdId, version)}`;
}

function parseToken(token: string): { householdId: string; version: number } | null {
  const [householdId, v, sig] = token.replace(/\.ics$/, "").split(".");
  const version = Number(v);
  if (!secret() || !householdId || !sig || !Number.isInteger(version)) return null;
  const expected = Buffer.from(sign(householdId, version));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? { householdId, version } : null;
}

// ── Formato iCalendar (RFC 5545) ─────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const ymd = (date: string) => date.replaceAll("-", "");
const localDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

// Líneas de más de 75 bytes se parten (con un espacio al principio de la continuación).
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let chunk = "";
  for (const ch of line) {
    if (Buffer.byteLength(chunk + ch, "utf8") > (out.length ? 74 : 75)) {
      out.push(chunk);
      chunk = "";
    }
    chunk += ch;
  }
  out.push(chunk);
  return out.join("\r\n ");
}

type Vevent = {
  uid: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  start: { date: string } | { ms: number };
  end?: { date: string } | { ms: number };
  yearly?: boolean;
};

function vevent(e: Vevent, stamp: string): string[] {
  const when = (key: "DTSTART" | "DTEND", v: { date: string } | { ms: number }) =>
    "date" in v ? `${key};VALUE=DATE:${ymd(v.date)}` : `${key}:${utc(v.ms)}`;
  const end = e.end ?? ("date" in e.start ? { date: addDays(e.start.date, 1) } : { ms: e.start.ms + 3600_000 });
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}@lovebug`,
    `DTSTAMP:${stamp}`,
    when("DTSTART", e.start),
    when("DTEND", end),
    ...(e.yearly ? ["RRULE:FREQ=YEARLY"] : []),
    `SUMMARY:${esc(e.summary)}`,
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    "END:VEVENT",
  ];
}

// null si el link no es válido (o se renovó): la ruta responde 404.
export async function buildCalendarFeed(token: string): Promise<string | null> {
  const parsed = parseToken(token);
  const admin = createAdminClient();
  if (!parsed || !admin) return null;
  const { data: household } = await admin.from("households").select("id, name, settings").eq("id", parsed.householdId).maybeSingle();
  if (!household || feedVersion(household.settings as HouseholdSettings) !== parsed.version) return null;

  const hh = household.id as string;
  const on = (key: string) => isModuleEnabled(household.settings as HouseholdSettings, key);
  const today = todayAR();
  const none = Promise.resolve({ data: null });
  const [membersRes, eventsRes, tripsRes, remindersRes, datesRes, contactsRes] = await Promise.all([
    admin.from("family_members").select("id, name, birthday").eq("household_id", hh),
    admin
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, all_day, location, notes, member_id")
      .eq("household_id", hh)
      .gte("starts_at", `${addDays(today, -90)}T00:00:00-03:00`)
      .lte("starts_at", `${addDays(today, 400)}T23:59:59-03:00`)
      .order("starts_at")
      .limit(1500),
    on("logistica")
      ? admin
          .from("logistics_trips")
          .select("id, trip_date, departure_time, arrival_time, origin, destination, member_id, driver_id, notes")
          .eq("household_id", hh)
          .gte("trip_date", addDays(today, -30))
          .lte("trip_date", addDays(today, 180))
          .limit(800)
      : none,
    on("vencimientos")
      ? admin.from("reminders").select("id, title, due_date, amount, notes").eq("household_id", hh).eq("done", false).gte("due_date", addDays(today, -30)).limit(500)
      : none,
    admin.from("important_dates").select("id, title, month, day, year, kind").eq("household_id", hh),
    on("circulo") ? admin.from("contacts").select("id, name, birthday").eq("household_id", hh).is("archived_at", null) : none,
  ]);

  const members = (membersRes.data ?? []) as { id: string; name: string; birthday: string | null }[];
  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? null;
  const stamp = utc(Date.now());
  const events: Vevent[] = [];

  for (const e of (eventsRes.data ?? []) as { id: string; title: string; starts_at: string; ends_at: string | null; all_day: boolean; location: string | null; notes: string | null; member_id: string | null }[]) {
    const who = name(e.member_id);
    const description = [who ? `De: ${who}` : null, e.notes].filter(Boolean).join("\n") || null;
    events.push(
      e.all_day
        ? { uid: `evento-${e.id}`, summary: e.title, description, location: e.location, start: { date: localDate(e.starts_at) } }
        : {
            uid: `evento-${e.id}`,
            summary: e.title,
            description,
            location: e.location,
            start: { ms: Date.parse(e.starts_at) },
            end: e.ends_at ? { ms: Date.parse(e.ends_at) } : undefined,
          }
    );
  }

  for (const t of (tripsRes.data ?? []) as { id: string; trip_date: string; departure_time: string | null; arrival_time: string | null; origin: string | null; destination: string; member_id: string | null; driver_id: string | null; notes: string | null }[]) {
    const at = (time: string) => Date.parse(`${t.trip_date}T${time.slice(0, 5)}:00-03:00`);
    const who = name(t.member_id);
    const summary = `🚗 ${who ? `${who} → ` : ""}${t.destination}`;
    const description = [name(t.driver_id) ? `Lleva: ${name(t.driver_id)}` : null, t.origin ? `Sale de: ${t.origin}` : null, t.notes].filter(Boolean).join("\n") || null;
    const start = t.departure_time ? at(t.departure_time) : t.arrival_time ? at(t.arrival_time) - 30 * 60_000 : null;
    const end = t.arrival_time ? at(t.arrival_time) : start !== null ? start + 30 * 60_000 : null;
    events.push(
      start === null
        ? { uid: `viaje-${t.id}`, summary, description, location: t.destination, start: { date: t.trip_date } }
        : { uid: `viaje-${t.id}`, summary, description, location: t.destination, start: { ms: start }, end: { ms: Math.max(end!, start + 15 * 60_000) } }
    );
  }

  for (const r of (remindersRes.data ?? []) as { id: string; title: string; due_date: string; amount: number | null; notes: string | null }[]) {
    events.push({
      uid: `vence-${r.id}`,
      summary: `💳 Vence: ${r.title}`,
      description: [r.amount ? formatARS(Number(r.amount)) : null, r.notes].filter(Boolean).join("\n") || null,
      start: { date: r.due_date },
    });
  }

  const birthdays = [...members, ...((contactsRes.data ?? []) as { id: string; name: string; birthday: string | null }[])];
  for (const p of birthdays) {
    if (!p.birthday) continue;
    events.push({ uid: `cumple-${p.id}`, summary: `🎂 Cumple de ${p.name}`, start: { date: p.birthday }, yearly: true });
  }
  for (const d of (datesRes.data ?? []) as { id: string; title: string; month: number; day: number; year: number | null; kind: string }[]) {
    const date = `${d.year ?? 2000}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
    events.push({ uid: `fecha-${d.id}`, summary: `${d.kind === "aniversario" ? "💞" : d.kind === "cumple" ? "🎂" : "⭐"} ${d.title}`, start: { date }, yearly: true });
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lovebug//Calendario familiar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Lovebug · ${household.name ?? "Familia"}`)}`,
    `X-WR-TIMEZONE:${TZ}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((e) => vevent(e, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
