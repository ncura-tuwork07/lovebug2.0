import "server-only";
import { cookies } from "next/headers";

// Cookie que prueba "esta cuenta mostró la huella hace poco en este dispositivo". Vive poco y se
// renueva sola mientras se use la app (como la sesión de Supabase); si pasa demasiado tiempo sin
// pedidos —se cerró la app, se fue a background, se la sacaron de reciente— hay que volver a
// mostrar la huella antes de ver nada del hogar. No guarda nada en la base: se verifica sola (HMAC)
// para no sumar una ida y vuelta más en cada pedido.
export const APP_LOCK_COOKIE = "lb_unlock";
// 5 minutos sin ningún pedido. Con menos, bloqueaba mientras alguien leía una pantalla sin tocar nada.
export const APP_LOCK_TTL_SECONDS = 300;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Reusamos la service role key como material de firma: ya es un secreto de servidor que nunca
// llega al navegador, y así no hace falta configurar (ni el usuario recordar cargar) una variable
// de entorno más. Si no está configurada, el bloqueo queda desactivado en vez de trabar todo.
function keySecret(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export function appLockEnabled(): boolean {
  return Boolean(keySecret());
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function signUnlock(userId: string): Promise<string | null> {
  const secret = keySecret();
  if (!secret) return null;
  const key = await hmacKey(secret);
  const expiresAt = Date.now() + APP_LOCK_TTL_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

// Para usar justo después de cualquier momento en el que la persona ya probó quién es: entrar
// con la huella, con la contraseña, o con un link de email (confirmación, recuperación). Así no
// la mandamos al bloqueo un segundo después de haber entrado.
export async function markDeviceUnlocked(userId: string): Promise<void> {
  const token = await signUnlock(userId);
  if (!token) return;
  const store = await cookies();
  store.set(APP_LOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: APP_LOCK_TTL_SECONDS,
  });
}

export async function verifyUnlock(token: string | undefined, userId: string): Promise<boolean> {
  const secret = keySecret();
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenUserId, expiresAtStr, signature] = parts;
  if (tokenUserId !== userId) return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(`${tokenUserId}.${expiresAtStr}`));
  return bytesToBase64Url(new Uint8Array(expected)) === signature;
}
