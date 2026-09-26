import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Uso de la app (pantalla visitada, última actividad, instalada o no) para el panel de admin.
// Endpoint aparte (fuera del middleware, sin la cola de server actions del router) para que
// registrar el uso nunca compita con la carga de la pantalla.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { path?: unknown; installed?: unknown } | null;
  // Solo rutas de pantallas: los contadores de la IA ("ia:…") los escribe el servidor.
  if (!body || typeof body.path !== "string" || !body.path.startsWith("/")) return new NextResponse(null, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return new NextResponse(null, { status: 204 });

  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("usage_events").insert({ user_id: userId, path: body.path.slice(0, 120) }),
    supabase.from("profiles").update({ last_seen_at: now }).eq("user_id", userId),
    body.installed === true
      ? supabase.from("profiles").update({ installed_at: now }).eq("user_id", userId).is("installed_at", null)
      : null,
  ]);
  return new NextResponse(null, { status: 204 });
}
