import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/data";
import { ProfilePicker } from "@/components/auth/ProfilePicker";

export const dynamic = "force-dynamic";

// El selector de perfiles (estilo Netflix): quien inicia sesión no tiene por qué ser un solo
// integrante — el hogar puede compartir un único login y elegir acá quién es quién.
export default async function PerfilPage() {
  const { user, household, members, me } = await getSessionContext();
  if (!user) redirect("/login");
  if (!household) redirect("/auth/salir");
  if (members.length === 0) redirect("/familia");
  if (me) redirect("/"); // ya hay un perfil elegido para esta sesión

  return <ProfilePicker members={members} householdName={household.name} />;
}
