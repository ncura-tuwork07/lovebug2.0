import { getMembers } from "@/lib/data";
import { MembersList } from "@/components/modules/MembersList";

export const dynamic = "force-dynamic";

export default async function FamiliaPage() {
  const members = await getMembers();

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-coral">Quiénes somos</p>
        <h1 className="text-h1 font-display font-bold text-ink">Familia</h1>
        <p className="mt-1 text-body text-ink-soft">
          Cada integrante tiene su color en toda la app. Agregá a los chicos para asignarles tareas, traslados y eventos.
        </p>
      </header>
      <MembersList members={members} />
    </div>
  );
}
