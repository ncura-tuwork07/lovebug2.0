"use server";

import { generateAuthenticationOptions, verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { createClient } from "@/lib/supabase/server";
import { getOrigin, getRpID } from "@/lib/webauthn";
import { markDeviceUnlocked } from "@/lib/appLock";
import { consumeChallenge, requireAdmin, saveChallenge } from "@/lib/passkeyChallenges";

// El bloqueo por huella (pantalla /bloqueo): ya hay una sesión de Supabase abierta, así que no
// hace falta el puente por magic link del login — solo confirmar que quien tiene el celu en mano
// puede mostrar una huella de esta cuenta.

// Mismas opciones que el login con huella (que ya anda en los celus de la familia): sin
// allowCredentials, el celu ofrece la llave que tenga. Después verificamos que sea de esta cuenta.
export async function getUnlockOptions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que iniciar sesión primero.");

  const options = await generateAuthenticationOptions({
    rpID: await getRpID(),
    userVerification: "required",
  });
  const admin = requireAdmin();
  const challengeId = await saveChallenge(admin, options.challenge, user.id);
  return { options, challengeId };
}

export async function verifyAppUnlock(input: { challengeId: string; response: AuthenticationResponseJSON }): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que iniciar sesión primero.");

  const admin = requireAdmin();
  const { challenge, user_id } = await consumeChallenge(admin, input.challengeId);
  if (user_id !== user.id) throw new Error("Ese pedido no es tuyo.");

  const credentialId = input.response.id;
  const { data: saved } = await supabase.from("user_passkeys").select("id, public_key, counter, transports").eq("id", credentialId).eq("user_id", user.id).maybeSingle();
  if (!saved) throw new Error("Esa huella no está activa en esta cuenta. Entrá con tu contraseña.");

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: challenge,
    expectedOrigin: await getOrigin(),
    expectedRPID: await getRpID(),
    credential: {
      id: saved.id as string,
      publicKey: isoBase64URL.toBuffer(saved.public_key as string),
      counter: saved.counter as number,
      transports: (saved.transports ?? undefined) as string[] | undefined,
    },
  });
  if (!verification.verified) throw new Error("No pudimos confirmar la huella. Probá de nuevo.");

  const { newCounter } = verification.authenticationInfo;
  if (saved.counter > 0 && newCounter <= saved.counter) throw new Error("Esa llave de acceso parece clonada. Volvé a entrar con tu contraseña.");
  await admin.from("user_passkeys").update({ counter: newCounter, last_used_at: new Date().toISOString() }).eq("id", saved.id);

  await markDeviceUnlocked(user.id);
}

// Para cuando la identidad ya se probó de otra forma (contraseña, link de email): password login,
// alta de hogar, unirse a uno. Evita mandar a /bloqueo un instante después de haber entrado.
export async function confirmDeviceUnlock(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await markDeviceUnlocked(user.id);
}
