import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { AuthShell, AuthLink } from "@/components/auth/AuthShell";
import { InviteJoin } from "@/components/auth/InviteJoin";

export const dynamic = "force-dynamic";

export default async function InvitacionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.trim().toUpperCase();
  const supabase = await createClient();
  const [{ data: householdName }, ctx] = await Promise.all([
    supabase.rpc("invite_preview", { p_code: code }),
    getSessionContext(),
  ]);

  if (!householdName) {
    return (
      <AuthShell
        title="Invitación inválida"
        subtitle="El código no existe o fue renovado. Pedile a quien te invitó que te mande el link de nuevo."
        footer={<AuthLink href="/">Ir al inicio</AuthLink>}
      >
        <div />
      </AuthShell>
    );
  }

  if (ctx.user && ctx.household) {
    const same = ctx.household.invite_code === code;
    return (
      <AuthShell
        title={same ? `Ya sos parte de ${ctx.household.name}` : "Ya tenés un hogar"}
        subtitle={
          same
            ? "No hace falta hacer nada más."
            : `Tu cuenta pertenece a “${ctx.household.name}”. Por ahora cada cuenta puede estar en un solo hogar.`
        }
        footer={<AuthLink href="/">Ir a la app</AuthLink>}
      >
        <div />
      </AuthShell>
    );
  }

  return <InviteJoin code={code} householdName={householdName as string} loggedIn={Boolean(ctx.user)} />;
}
