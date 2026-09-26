"use server";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { APP_LOCK_COOKIE, appLockEnabled, markDeviceUnlocked, verifyUnlock } from "@/lib/appLock";
import { requireAdmin } from "@/lib/passkeyChallenges";

// Huella nativa (la app Android de Lovebug): el celu guarda un secreto en su chip de seguridad que
// solo se lee después de la huella (BiometricPrompt, como los bancos). Acá guardamos el hash de ese
// secreto en app_metadata de la cuenta (solo lo escribe el servidor) y lo cambiamos por el
// desbloqueo, o por una sesión nueva si no había. Sin tablas nuevas.

type NativeDevice = { id: string; hash: string; label: string; created_at: string; last_used_at: string | null };
const MAX_DEVICES = 5;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function devicesOf(admin: ReturnType<typeof requireAdmin>, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("No encontramos la cuenta.");
  const meta = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  return { user: data.user, meta, devices: (Array.isArray(meta.native_devices) ? meta.native_devices : []) as NativeDevice[] };
}

async function saveDevices(admin: ReturnType<typeof requireAdmin>, userId: string, meta: Record<string, unknown>, devices: NativeDevice[]) {
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...meta, native_devices: devices } });
  if (error) throw new Error(error.message);
}

// Activar la huella en este celu. Solo desde una sesión ya desbloqueada (recién entró con contraseña
// o con huella), así nadie la activa con un celu ajeno que quedó abierto.
export async function enrollNativeDevice(label: string): Promise<{ userId: string; token: string; deviceId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que iniciar sesión primero.");
  if (appLockEnabled() && !(await verifyUnlock((await cookies()).get(APP_LOCK_COOKIE)?.value, user.id))) {
    throw new Error("Por seguridad, volvé a entrar con tu contraseña y activala enseguida.");
  }

  const admin = requireAdmin();
  const { meta, devices } = await devicesOf(admin, user.id);
  const token = randomBytes(32).toString("base64url");
  const device: NativeDevice = { id: randomUUID(), hash: sha256(token), label: label.slice(0, 60) || "Celular", created_at: new Date().toISOString(), last_used_at: null };
  await saveDevices(admin, user.id, meta, [...devices, device].slice(-MAX_DEVICES));
  return { userId: user.id, token, deviceId: device.id };
}

// Después de la huella: si la sesión sigue abierta solo desbloquea; si no (se cerró o expiró), abre
// una nueva como el login con passkey (magic link generado y verificado en el servidor).
export async function nativeUnlock(input: { userId: string; token: string }): Promise<void> {
  const admin = requireAdmin();
  const { user, meta, devices } = await devicesOf(admin, input.userId).catch(() => {
    throw new Error("La huella de este celu ya no es válida. Entrá con tu contraseña y volvé a activarla.");
  });
  const given = Buffer.from(sha256(input.token), "hex");
  const device = devices.find((d) => {
    const saved = Buffer.from(d.hash, "hex");
    return saved.length === given.length && timingSafeEqual(saved, given);
  });
  if (!device) throw new Error("La huella de este celu ya no es válida. Entrá con tu contraseña y volvé a activarla.");

  const supabase = await createClient();
  const {
    data: { user: current },
  } = await supabase.auth.getUser();
  if (current?.id !== user.id) {
    if (!user.email) throw new Error("No encontramos el email de la cuenta.");
    if (current) await supabase.auth.signOut();
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
    if (linkError) throw new Error(linkError.message);
    const { error: otpError } = await supabase.auth.verifyOtp({ type: link.properties.verification_type as EmailOtpType, token_hash: link.properties.hashed_token });
    if (otpError) throw new Error("No pudimos iniciar sesión con la huella. Probá con tu email y contraseña.");
  }

  await markDeviceUnlocked(user.id);
  await saveDevices(admin, user.id, meta, devices.map((d) => (d.id === device.id ? { ...d, last_used_at: new Date().toISOString() } : d))).catch(() => {});
}

// Apagar la huella de un celu (desde ese celu o desde Ajustes en cualquier otro).
export async function removeNativeDevice(deviceId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que iniciar sesión primero.");
  const admin = requireAdmin();
  const { meta, devices } = await devicesOf(admin, user.id);
  await saveDevices(admin, user.id, meta, devices.filter((d) => d.id !== deviceId));
}

export async function listNativeDevices(): Promise<Omit<NativeDevice, "hash">[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = requireAdmin();
  const { devices } = await devicesOf(admin, user.id);
  return devices.map((d) => ({ id: d.id, label: d.label, created_at: d.created_at, last_used_at: d.last_used_at }));
}
