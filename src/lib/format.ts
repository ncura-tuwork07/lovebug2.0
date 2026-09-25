import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const TZ = "America/Argentina/Buenos_Aires";

// "YYYY-MM-DD" de hoy en Argentina (el servidor de Vercel corre en UTC).
export function todayAR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const d = parseISO(isoDate);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}

// Primer día del mes, corrido n meses (n negativo = hacia atrás). Sirve para navegar meses.
export function addMonths(isoDate: string, n: number): string {
  const d = parseISO(isoDate);
  return format(new Date(d.getFullYear(), d.getMonth() + n, 1), "yyyy-MM-dd");
}

export function monthRange(isoDate = todayAR()): { from: string; to: string } {
  const d = parseISO(isoDate);
  const from = format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd");
  const to = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd");
  return { from, to };
}

export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDay(isoDate: string, pattern = "EEE d MMM"): string {
  return format(parseISO(isoDate), pattern, { locale: es });
}

export function formatDateTime(iso: string, pattern = "EEE d MMM · HH:mm"): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: TZ,
    weekday: pattern.includes("EEE") ? "short" : undefined,
    day: "numeric",
    month: "short",
    hour: pattern.includes("HH") ? "2-digit" : undefined,
    minute: pattern.includes("mm") ? "2-digit" : undefined,
  });
}

export function timeHM(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
}

// "HH:MM:SS" → "HH:MM"
export function shortTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

export function relativeDayLabel(isoDate: string): string {
  const today = todayAR();
  if (isoDate === today) return "Hoy";
  if (isoDate === addDays(today, 1)) return "Mañana";
  if (isoDate === addDays(today, -1)) return "Ayer";
  return formatDay(isoDate, "EEEE d 'de' MMMM");
}
