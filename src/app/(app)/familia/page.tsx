import Link from "next/link";
import { Contact } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { isModuleEnabled } from "@/lib/modules";
import { MembersList } from "@/components/modules/MembersList";

export const dynamic = "force-dynamic";

export default async function FamiliaPage() {
  const supabase = await createClient();
  const [{ members, household }, { data: ledger }] = await Promise.all([
    getSessionContext(),
    supabase.from("points_ledger").select("member_id, points"),
  ]);
  const points: Record<string, number> = {};
  for (const l of ledger ?? []) points[l.member_id] = (points[l.member_id] ?? 0) + l.points;

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-coral">Quiénes somos</p>
        <h1 className="text-h1 font-display font-bold text-ink">Familia</h1>
        <p className="mt-1 text-body text-ink-soft">
          Tocá a alguien para ver su perfil: foto, datos, documentos. El color los identifica en toda la app.
        </p>
      </header>
      <MembersList members={members} points={points} />
      {isModuleEnabled(household?.settings, "circulo") && (
        <Link href="/circulo" className="lb-card flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: "#0891B2" }}>
            <Contact size={18} />
          </span>
          <span>
            <span className="block font-display text-item font-semibold text-ink">Tu Círculo</span>
            <span className="block text-meta text-ink-faint">Abuelos, tíos, amigos: gente fuera de casa, con sus cumples.</span>
          </span>
        </Link>
      )}
    </div>
  );
}
