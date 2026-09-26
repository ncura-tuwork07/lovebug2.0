import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/data";
import { MAX_PHOTOS, sketchHome } from "@/lib/homePlan";

// "Dibujá mi casa" con IA: fotos (ya achicadas en el celu) + lo que cuentan → boceto del plano.
// No se guarda nada acá: la persona lo mira y decide si lo usa.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAILY_LIMIT = 10;
const USAGE_PATH = "ia:plano";
const MAX_PHOTO_CHARS = 1_500_000; // ~1 MB por foto en base64

export async function POST(request: Request) {
  const { user, household } = await getSessionContext();
  if (!user || !household) return NextResponse.json({ ok: false, error: "Tenés que iniciar sesión." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { description?: unknown; photos?: unknown } | null;
  const description = typeof body?.description === "string" ? body.description.slice(0, 4000) : "";
  const photos = Array.isArray(body?.photos)
    ? body.photos.filter((p): p is string => typeof p === "string" && p.length < MAX_PHOTO_CHARS).slice(0, MAX_PHOTOS)
    : [];
  if (description.trim().length < 15 && !photos.length) {
    return NextResponse.json({ ok: false, error: "Contame un poco cómo es la casa o mandame alguna foto." });
  }

  const admin = createAdminClient();
  if (admin) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.id)
      .eq("path", USAGE_PATH)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ ok: false, error: `Por hoy ya dibujamos la casa ${DAILY_LIMIT} veces. Mañana se renueva.` });
  }

  const result = await sketchHome({ description, photos });
  if (result.ok) {
    const supabase = await createClient();
    await supabase.from("usage_events").insert({ user_id: user.id, path: USAGE_PATH });
  }
  return NextResponse.json(result);
}
