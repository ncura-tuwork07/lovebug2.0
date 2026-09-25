"use client";

import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startRegistration } from "@simplewebauthn/browser";
import { getPasskeyRegistrationOptions, verifyPasskeyRegistration } from "@/app/actions/passkeys";

// Qué llave de acceso quedó guardada en ESTE dispositivo (id de la credencial). El servidor
// sabe qué llaves tiene la cuenta, pero no en qué celu está parado cada uno: esto sí.
const DEVICE_KEY = "lb-passkey-device";
const DISMISSED_KEY = "lb-passkey-dismissed-at";
const ASK_AGAIN_AFTER_DAYS = 30;

export function devicePasskeyId(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

export function deviceHasPasskey(): boolean {
  try {
    return Boolean(localStorage.getItem(DEVICE_KEY));
  } catch {
    return false;
  }
}

export function forgetDevicePasskey(credentialId?: string) {
  try {
    if (!credentialId || localStorage.getItem(DEVICE_KEY) === credentialId) localStorage.removeItem(DEVICE_KEY);
  } catch {}
}

export function rememberDevicePasskey(credentialId: string) {
  try {
    localStorage.setItem(DEVICE_KEY, credentialId);
    localStorage.removeItem(DISMISSED_KEY);
  } catch {}
}

export function dismissPasskeyOffer() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    return at > 0 && Date.now() - at < ASK_AGAIN_AFTER_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

// ¿Tiene sentido ofrecer la huella acá? Celu/compu con lector (o patrón/PIN de pantalla),
// que todavía no la activó y que no dijo "ahora no" hace poco.
export async function shouldOfferPasskey(): Promise<boolean> {
  if (!browserSupportsWebAuthn() || deviceHasPasskey() || recentlyDismissed()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

export function guessDeviceLabel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  return "Este dispositivo";
}

// Pide la huella/patrón ahora mismo y deja la llave guardada en la cuenta y en este dispositivo.
export async function registerThisDevice(label?: string): Promise<void> {
  const { options, challengeId } = await getPasskeyRegistrationOptions();
  const response = await startRegistration({ optionsJSON: options });
  await verifyPasskeyRegistration({ challengeId, response, deviceLabel: label || guessDeviceLabel() });
  rememberDevicePasskey(response.id);
}
