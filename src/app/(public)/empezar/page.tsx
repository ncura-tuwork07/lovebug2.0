import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/data";
import { Onboarding } from "@/components/auth/Onboarding";

export const dynamic = "force-dynamic";

// Usuario con cuenta pero sin hogar (por ejemplo, confirmó el email recién): crea uno o se suma con código.
export default async function EmpezarPage() {
  const { user, household, me } = await getSessionContext();
  if (!user) redirect("/login");
  if (household && me) redirect("/");
  const meta = (user.user_metadata ?? {}) as { name?: string; role?: string; household_name?: string; invite_code?: string };
  return (
    <Onboarding
      defaultName={meta.name ?? ""}
      defaultRole={meta.role ?? ""}
      defaultHouseholdName={meta.household_name ?? ""}
      defaultCode={meta.invite_code ?? ""}
      email={user.email ?? ""}
    />
  );
}
