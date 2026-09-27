import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { APP_LOCK_COOKIE, appLockEnabled, verifyUnlock } from "@/lib/appLock";
import { PING_PENDING_MS, type HomePing, type Room } from "@/lib/home";

// "¿Dónde estás?" / "Vení para acá": lo que me preguntaron y todavía no contesté, y las respuestas
// a lo que pregunté yo. Lo pide la app al abrirse, cada tanto y cuando cambia algo (tiempo real).
// /api no pasa por el middleware, así que el bloqueo con huella se revisa acá.
export const dynamic = "force-dynamic";

type Payload = { pending: HomePing[]; answered: HomePing[]; rooms: Room[] };
const empty: Payload = { pending: [], answered: [], rooms: [] };

export async function GET() {
  const { user, me, household } = await getSessionContext();
  if (!user || !household || !me) return NextResponse.json(empty, { status: 401 });
  if (appLockEnabled() && !(await verifyUnlock((await cookies()).get(APP_LOCK_COOKIE)?.value, user.id))) {
    return NextResponse.json(empty, { status: 423 });
  }
  if (!isModuleEnabled(household.settings, "casa")) return NextResponse.json(empty);

  const supabase = await createClient();
  const now = Date.now();
  const [pendingRes, answeredRes] = await Promise.all([
    supabase
      .from("home_pings")
      .select("*")
      .eq("to_member", me.id)
      .is("answered_at", null)
      .gte("created_at", new Date(now - PING_PENDING_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("home_pings")
      .select("*")
      .eq("from_member", me.id)
      .gte("answered_at", new Date(now - 15 * 60_000).toISOString())
      .order("answered_at", { ascending: false })
      .limit(5),
  ]);
  // Sin la migración 015 las tablas no existen: no hay nada que mostrar.
  if (pendingRes.error) return NextResponse.json({ ...empty, ready: false }, { headers: { "cache-control": "no-store" } });
  const pending = (pendingRes.data ?? []) as HomePing[];
  const answered = ((answeredRes.data ?? []) as HomePing[]).filter((p) => p.answered_at);
  const rooms = pending.length || answered.length ? (((await supabase.from("home_rooms").select("id, name, kind, floor, x, y, w, h").order("created_at")).data ?? []) as Room[]) : [];
  return NextResponse.json({ pending, answered, rooms } satisfies Payload, { headers: { "cache-control": "no-store" } });
}
