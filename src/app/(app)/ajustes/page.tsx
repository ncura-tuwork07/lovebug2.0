import { getPasskeys, getSessionContext } from "@/lib/data";
import { isAppAdmin } from "@/lib/admin";
import { SettingsView } from "@/components/modules/SettingsView";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const { user, household, members, me } = await getSessionContext();
  if (!household || !me) return null;
  const [isAdmin, passkeys] = await Promise.all([isAppAdmin(user?.id), getPasskeys()]);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-coral">Tu hogar</p>
        <h1 className="text-h1 font-display font-bold text-ink">Ajustes</h1>
      </header>
      <SettingsView household={household} members={members} me={me} email={user?.email ?? ""} isAdmin={isAdmin} passkeys={passkeys} />
    </div>
  );
}
