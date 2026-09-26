"use server";

import { revalidatePath } from "next/cache";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import { createClient } from "@/lib/supabase/server";
import { getOrigin, getRpID, RP_NAME } from "@/lib/webauthn";
import { markDeviceUnlocked } from "@/lib/appLock";
import { consumeChallenge, requireAdmin, saveChallenge } from "@/lib/passkeyChallenges";

// ───────────────── Alta de una passkey (desde Ajustes, ya logueado) ─────────────────

export async function getPasskeyRegistrationOptions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Tenés que iniciar sesión primero.");

  const { data: existing } = await supabase.from("user_passkeys").select("id, transports").eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: await getRpID(),
    userName: user.email,
    userID: isoUint8Array.fromUTF8String(user.id),
    userDisplayName: user.email,
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((p) => ({ id: p.id as string, transports: (p.transports ?? undefined) as ("ble" | "hybrid" | "internal" | "nfc" | "usb")[] | undefined })),
    // "platform": la llave queda en este celu y se desbloquea con la huella o el patrón/PIN de pantalla.
    authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
  });

  const admin = requireAdmin();
  const challengeId = await saveChallenge(admin, options.challenge, user.id);
  return { options, challengeId };
}

export async function verifyPasskeyRegistration(input: { challengeId: string; response: RegistrationResponseJSON; deviceLabel: string }): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que iniciar sesión primero.");

  const admin = requireAdmin();
  const { challenge, user_id } = await consumeChallenge(admin, input.challengeId);
  if (user_id !== user.id) throw new Error("Ese pedido no es tuyo.");

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: challenge,
    expectedOrigin: await getOrigin(),
    expectedRPID: await getRpID(),
  });
  if (!verification.verified || !verification.registrationInfo) throw new Error("No pudimos confirmar la huella. Probá de nuevo.");

  const { credential } = verification.registrationInfo;
  const { error } = await admin.from("user_passkeys").insert({
    id: credential.id,
    user_id: user.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? null,
    device_label: input.deviceLabel.trim() || "Este dispositivo",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function deletePasskey(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("user_passkeys").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

// ───────────────── Login con passkey (sin sesión todavía) ─────────────────

export async function getPasskeyLoginOptions() {
  const options = await generateAuthenticationOptions({
    rpID: await getRpID(),
    userVerification: "required",
  });
  const admin = requireAdmin();
  const challengeId = await saveChallenge(admin, options.challenge, null);
  return { options, challengeId };
}

export async function verifyPasskeyLogin(input: { challengeId: string; response: AuthenticationResponseJSON }): Promise<{ email: string; token: string }> {
  const admin = requireAdmin();
  const { challenge } = await consumeChallenge(admin, input.challengeId);

  const credentialId = input.response.id;
  const { data: saved, error: savedError } = await admin
    .from("user_passkeys")
    .select("id, user_id, public_key, counter, transports")
    .eq("id", credentialId)
    .maybeSingle();
  if (savedError) throw new Error(savedError.message);
  if (!saved) throw new Error("No reconocemos ese acceso. Probá con tu email y contraseña.");

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
  if (saved.counter > 0 && newCounter <= saved.counter) throw new Error("Esa llave de acceso parece clonada. Por seguridad, entrá con tu email y contraseña.");
  await admin.from("user_passkeys").update({ counter: newCounter, last_used_at: new Date().toISOString() }).eq("id", saved.id);

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(saved.user_id as string);
  if (userError || !userData.user?.email) throw new Error("No encontramos la cuenta de esa passkey.");

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: userData.user.email });
  if (linkError) throw new Error(linkError.message);
  // Ya mostró la huella recién: no hace falta pedírsela de nuevo apenas entre.
  await markDeviceUnlocked(saved.user_id as string);
  return { email: userData.user.email, token: link.properties.hashed_token };
}
