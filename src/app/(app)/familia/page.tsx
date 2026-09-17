import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data";
import { MembersList } from "@/components/modules/MembersList";

export const dynamic = "force-dynamic";

export default async function FamiliaPage() {
  const supabase = await createClient();
  const [members, { data: ledger }] = await Promise.all([
    getMembers(),
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
    </div>
  );
}
