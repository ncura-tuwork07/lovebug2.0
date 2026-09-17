import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import type { Project } from "@/lib/types";
import { ProjectsList } from "@/components/modules/ProjectsList";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const [members, { data }] = await Promise.all([
    getMembers(),
    supabase.from("projects").select("*").order("status").order("due_date", { nullsFirst: false }).order("created_at"),
  ]);
  const me = await getCurrentMember(members);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "var(--color-jaz)" }}>
          Lo que nos proponemos
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Metas y proyectos</h1>
      </header>
      <ProjectsList projects={(data ?? []) as Project[]} members={members} currentMemberId={me?.id ?? null} />
    </div>
  );
}
