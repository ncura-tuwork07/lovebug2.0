import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { APP_LOCK_COOKIE, appLockEnabled, verifyUnlock } from "@/lib/appLock";
import { computeAlerts } from "@/lib/alerts";

// La campanita de arriba. /api no pasa por el middleware, así que el bloqueo con huella se revisa acá.
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, members, household } = await getSessionContext();
  if (!user || !household) return NextResponse.json({ alerts: [] }, { status: 401 });
  if (appLockEnabled() && !(await verifyUnlock((await cookies()).get(APP_LOCK_COOKIE)?.value, user.id))) {
    return NextResponse.json({ alerts: [] }, { status: 423 });
  }
  const alerts = await computeAlerts(await createClient(), household.settings, members);
  return NextResponse.json({ alerts }, { headers: { "cache-control": "no-store" } });
}
