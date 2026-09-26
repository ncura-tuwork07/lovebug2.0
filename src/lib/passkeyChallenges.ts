import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PASSKEY_CHALLENGE_TTL_MINUTES } from "@/lib/webauthn";

// Helpers compartidos por el login/alta de passkeys (passkeys.ts) y el bloqueo por huella
// (appLock.ts): los desafíos de WebAuthn viven en passkey_challenges, sin políticas RLS
// (solo service role), porque el login todavía no tiene sesión cuando se generan.

export function requireAdmin() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Los accesos con huella no están configurados en el servidor.");
  return admin;
}

// Los desafíos son de un solo uso y viven poco: borramos los vencidos cada vez que creamos uno.
export async function saveChallenge(admin: ReturnType<typeof requireAdmin>, challenge: string, userId: string | null): Promise<string> {
  const staleBefore = new Date(Date.now() - PASSKEY_CHALLENGE_TTL_MINUTES * 60_000).toISOString();
  await admin.from("passkey_challenges").delete().lt("created_at", staleBefore);
  const { data, error } = await admin.from("passkey_challenges").insert({ challenge, user_id: userId }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function consumeChallenge(admin: ReturnType<typeof requireAdmin>, challengeId: string): Promise<{ challenge: string; user_id: string | null }> {
  const { data, error } = await admin.from("passkey_challenges").select("challenge, user_id, created_at").eq("id", challengeId).maybeSingle();
  await admin.from("passkey_challenges").delete().eq("id", challengeId);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("El pedido venció. Probá de nuevo.");
  const ageMinutes = (Date.now() - new Date(data.created_at).getTime()) / 60_000;
  if (ageMinutes > PASSKEY_CHALLENGE_TTL_MINUTES) throw new Error("El pedido venció. Probá de nuevo.");
  return data;
}
