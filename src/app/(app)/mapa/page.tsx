import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import type { MemberLocation } from "@/lib/types";
import { FamilyMap } from "@/components/modules/FamilyMap";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const supabase = await createClient();
  const [{ members, me }, { data }] = await Promise.all([getSessionContext(), supabase.from("locations").select("*")]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header>
        <p className="text-sm text-info">Dónde está cada uno</p>
        <h1 className="text-h1 font-display font-bold text-ink">Mapa</h1>
      </header>
      <FamilyMap
        members={members}
        locations={(data ?? []) as MemberLocation[]}
        myId={me?.id ?? null}
        mySharing={me?.share_location ?? false}
      />
    </div>
  );
}
