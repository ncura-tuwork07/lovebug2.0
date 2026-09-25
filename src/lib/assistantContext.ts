import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContacts, getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { addDays, todayAR } from "@/lib/format";
import type { PlanContext } from "@/lib/assistant";

// Tope diario por hogar: la IA es gratis para las familias, así que la cuidamos.
const DAILY_LIMIT = 30;
const MAX_CHARS = 5000;
const USAGE_PATH = "ia:contale";

export type Prepared = { ok: true; ctx: PlanContext; logUsage: () => Promise<void> } | { ok: false; error: string };

// Junta lo que Claude necesita saber del hogar (integrantes, Círculo, lo que ya está en el
// calendario, módulos prendidos) y controla el tope diario.
export async function preparePlanContext(text: string): Promise<Prepared> {
  const input = text.trim();
  if (input.length < 8) return { ok: false, error: "Contame un poco más: qué, cuándo y quién." };
  if (input.length > MAX_CHARS) return { ok: false, error: "Es muy largo para una sola vez. Probá en dos partes." };

  const { user, members, me, household } = await getSessionContext();
  if (!user || !household) return { ok: false, error: "Tenés que iniciar sesión." };

  const admin = createAdminClient();
  if (admin) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.id)
      .eq("path", USAGE_PATH)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return { ok: false, error: `Por hoy ya usaron la IA ${DAILY_LIMIT} veces. Mañana se renueva.` };
  }

  const supabase = await createClient();
  const today = todayAR();
  const [contacts, { data: events }] = await Promise.all([
    getContacts().catch(() => []),
    supabase
      .from("calendar_events")
      .select("title, starts_at, all_day")
      .gte("starts_at", `${today}T00:00:00-03:00`)
      .lt("starts_at", `${addDays(today, 21)}T00:00:00-03:00`)
      .order("starts_at")
      .limit(40),
  ]);

  const on = (key: string) => isModuleEnabled(household.settings, key);
  return {
    ok: true,
    ctx: {
      text: input,
      now: new Date(),
      today,
      householdName: household.name ?? null,
      members,
      me,
      contacts: contacts.map((c) => ({ name: c.name, relationship: c.relationship })),
      upcoming: (events ?? []).map((e) => ({
        title: e.title,
        when: e.all_day
          ? e.starts_at.slice(0, 10)
          : new Date(e.starts_at).toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 16),
      })),
      enabled: { logistica: on("logistica"), compras: on("compras"), vencimientos: on("vencimientos"), menu: on("menu") },
    },
    logUsage: async () => {
      await supabase.from("usage_events").insert({ user_id: user.id, path: USAGE_PATH });
    },
  };
}
