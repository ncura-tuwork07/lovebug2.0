import { buildCalendarFeed } from "@/lib/calendarFeed";

// El .ics de la suscripción. Lo piden Google Calendar, el iPhone u Outlook cada tantas horas, sin
// sesión: el link firmado es la llave (ver lib/calendarFeed).
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ics = await buildCalendarFeed(token);
  if (!ics) return new Response("Este link de calendario ya no es válido.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="lovebug.ics"',
      "cache-control": "private, max-age=300",
    },
  });
}
