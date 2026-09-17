import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULES } from "@/lib/modules";

export type AdminMetrics = {
  households: number;
  users: number;
  installs: number;
  active7: number;
  active30: number;
  householdsActive7: number;
  newHouseholds30: number;
  pushDevices: number;
  modules: { key: string; label: string; color: string; events: number; users: number }[];
  households_list: {
    id: string;
    name: string;
    created_at: string;
    members: number;
    accounts: number;
    installs: number;
    last_seen_at: string | null;
    events30: number;
  }[];
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// Métricas agregadas para el panel de admin. Solo con service role (app_admins no tiene RLS).
export async function getAdminMetrics(): Promise<AdminMetrics | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [hh, profiles, members, events, push] = await Promise.all([
    admin.from("households").select("id, name, created_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("user_id, household_id, last_seen_at, installed_at"),
    admin.from("family_members").select("id, household_id, user_id"),
    admin.from("usage_events").select("household_id, user_id, path").gte("created_at", since30).limit(50000),
    admin.from("push_subscriptions").select("id", { count: "exact", head: true }),
  ]);

  const households = hh.data ?? [];
  const profs = profiles.data ?? [];
  const mems = members.data ?? [];
  const evs = events.data ?? [];

  const active7Users = new Set(profs.filter((p) => p.last_seen_at && p.last_seen_at >= since7).map((p) => p.user_id));
  const active30Users = new Set(profs.filter((p) => p.last_seen_at && p.last_seen_at >= since30).map((p) => p.user_id));
  const householdsActive7 = new Set(profs.filter((p) => p.household_id && p.last_seen_at && p.last_seen_at >= since7).map((p) => p.household_id));

  // Uso por módulo (últimos 30 días): eventos y usuarios distintos por prefijo de ruta.
  const perModule = new Map<string, { events: number; users: Set<string> }>();
  const moduleFor = (path: string) => {
    if (path === "/") return "hoy";
    return MODULES.find((m) => path === m.href || path.startsWith(m.href + "/"))?.key ?? (path.startsWith("/ajustes") ? "ajustes" : null);
  };
  for (const e of evs) {
    const key = moduleFor(e.path);
    if (!key) continue;
    const cur = perModule.get(key) ?? { events: 0, users: new Set<string>() };
    cur.events++;
    if (e.user_id) cur.users.add(e.user_id);
    perModule.set(key, cur);
  }
  const moduleRows = [
    { key: "hoy", label: "Hoy", color: "#FFB347" },
    ...MODULES.map((m) => ({ key: m.key, label: m.label, color: m.color })),
    { key: "ajustes", label: "Ajustes", color: "#64748B" },
  ]
    .map((m) => ({ ...m, events: perModule.get(m.key)?.events ?? 0, users: perModule.get(m.key)?.users.size ?? 0 }))
    .sort((a, b) => b.events - a.events);

  const events30ByHousehold = new Map<string, number>();
  for (const e of evs) if (e.household_id) events30ByHousehold.set(e.household_id, (events30ByHousehold.get(e.household_id) ?? 0) + 1);

  const households_list = households.map((h) => {
    const hp = profs.filter((p) => p.household_id === h.id);
    const hm = mems.filter((m) => m.household_id === h.id);
    const last = hp.map((p) => p.last_seen_at).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
    return {
      id: h.id,
      name: h.name,
      created_at: h.created_at,
      members: hm.length,
      accounts: hm.filter((m) => m.user_id).length,
      installs: hp.filter((p) => p.installed_at).length,
      last_seen_at: last,
      events30: events30ByHousehold.get(h.id) ?? 0,
    };
  });

  return {
    households: households.length,
    users: profs.length,
    installs: profs.filter((p) => p.installed_at).length,
    active7: active7Users.size,
    active30: active30Users.size,
    householdsActive7: householdsActive7.size,
    newHouseholds30: households.filter((h) => h.created_at >= since30).length,
    pushDevices: push.count ?? 0,
    modules: moduleRows,
    households_list,
  };
}
