import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { isAppAdmin } from "@/lib/admin";
import type { HomeMove, HomePing, Presence, Room } from "@/lib/home";
import { HomePlan } from "@/components/modules/HomePlan";
import { HomeSetup } from "@/components/modules/HomeSetup";
import { HOME_MIGRATION_SQL, HOME_PINGS_SQL, supabaseSqlEditorUrl } from "@/lib/homeMigration";

export const dynamic = "force-dynamic";

export default async function CasaPage() {
  const supabase = await createClient();
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const [{ user, members, me, household }, roomsRes, presenceRes, movesRes] = await Promise.all([
    getSessionContext(),
    supabase.from("home_rooms").select("id, name, kind, floor, x, y, w, h").order("created_at"),
    supabase.from("home_presence").select("member_id, room_id, updated_at"),
    supabase.from("home_moves").select("member_id, from_room, to_room, moved_at").gte("moved_at", hourAgo).order("moved_at").limit(200),
  ]);
  // Lo que pregunté yo en la última hora ("esperando respuesta" / "está en la cocina").
  const pingsRes = me
    ? await supabase.from("home_pings").select("*").eq("from_member", me.id).gte("created_at", hourAgo).order("created_at", { ascending: false }).limit(30)
    : { data: [], error: null };

  // Hasta que se corre la migración 014 las tablas no existen: avisamos en vez de romper.
  const missing = Boolean(roomsRes.error || presenceRes.error);
  if (missing) console.error("[casa]", roomsRes.error?.message ?? presenceRes.error?.message);
  // Sin la 015 el plano anda igual, pero sin "¿Dónde estás?" ni pisadas guardadas.
  const pingsReady = !missing && !movesRes.error && !pingsRes.error;
  const admin = missing || !pingsReady ? await isAppAdmin(user?.id) : false;

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header>
        <p className="lb-tint text-sm" style={{ "--tint": "#D97706" } as CSSProperties}>
          Nuestro lugar
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Casa</h1>
      </header>
      {missing ? (
        admin ? (
          <HomeSetup sql={HOME_MIGRATION_SQL + "\n" + HOME_PINGS_SQL} editorUrl={supabaseSqlEditorUrl()} />
        ) : (
          <section className="lb-card flex flex-col gap-2">
            <p className="text-item font-medium text-ink">El plano de la casa está casi listo 🏡</p>
            <p className="text-meta text-ink-faint">Estamos terminando de prepararlo. Probá de nuevo en un rato.</p>
          </section>
        )
      ) : (
        <>
          {!pingsReady && admin && (
            <HomeSetup
              sql={HOME_PINGS_SQL}
              editorUrl={supabaseSqlEditorUrl()}
              title="Nuevo: “¿Dónde estás?” y el Mapa del Merodeador 🪄"
              intro="Para preguntarle a alguien en qué parte de la casa está y ver las pisadas, falta un paso en Supabase (una sola vez):"
            />
          )}
          <HomePlan
            rooms={(roomsRes.data ?? []) as Room[]}
            presence={(presenceRes.data ?? []) as Presence[]}
            members={members}
            myId={me?.id ?? null}
            householdName={household?.name ?? null}
            pings={pingsReady ? ((pingsRes.data ?? []) as HomePing[]) : null}
            moves={pingsReady ? ((movesRes.data ?? []) as HomeMove[]) : []}
            ai={Boolean(process.env.ANTHROPIC_API_KEY)}
          />
        </>
      )}
    </div>
  );
}
