import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { isAppAdmin } from "@/lib/admin";
import type { Presence, Room } from "@/lib/home";
import { HomePlan } from "@/components/modules/HomePlan";

export const dynamic = "force-dynamic";

export default async function CasaPage() {
  const supabase = await createClient();
  const [{ user, members, me }, roomsRes, presenceRes] = await Promise.all([
    getSessionContext(),
    supabase.from("home_rooms").select("id, name, kind, floor, x, y, w, h").order("created_at"),
    supabase.from("home_presence").select("member_id, room_id, updated_at"),
  ]);

  // Hasta que se corre la migración 014 las tablas no existen: avisamos en vez de romper.
  const missing = Boolean(roomsRes.error || presenceRes.error);
  if (missing) console.error("[casa]", roomsRes.error?.message ?? presenceRes.error?.message);
  const admin = missing ? await isAppAdmin(user?.id) : false;

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header>
        <p className="lb-tint text-sm" style={{ "--tint": "#D97706" } as CSSProperties}>
          Nuestro lugar
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Casa</h1>
      </header>
      {missing ? (
        <section className="lb-card flex flex-col gap-2">
          <p className="text-item font-medium text-ink">El plano de la casa está casi listo 🏡</p>
          <p className="text-meta text-ink-faint">
            {admin
              ? "Falta crear sus tablas: corré supabase/migrations/014_plano_de_la_casa.sql en el SQL Editor de Supabase y recargá."
              : "Estamos terminando de prepararlo. Probá de nuevo en un rato."}
          </p>
        </section>
      ) : (
        <HomePlan rooms={(roomsRes.data ?? []) as Room[]} presence={(presenceRes.data ?? []) as Presence[]} members={members} myId={me?.id ?? null} />
      )}
    </div>
  );
}
