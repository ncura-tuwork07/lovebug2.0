import "server-only";
import { createSign } from "node:crypto";
import type { PushPayload } from "@/lib/push";

// Avisos a la app de Android por Firebase Cloud Messaging (API HTTP v1). El WebView no tiene
// notificaciones web, así que la app se registra en Firebase y guardamos su token en
// push_subscriptions como "fcm:<token>". La credencial es la cuenta de servicio de Firebase (el JSON
// entero, o en base64) en la variable FIREBASE_SERVICE_ACCOUNT de Vercel.

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

export const FCM_PREFIX = "fcm:";
export const FCM_CHANNEL = "avisos"; // el mismo canal que crea la app al activar los avisos

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    if (!json.project_id || !json.client_email || !json.private_key) return null;
    return { project_id: json.project_id, client_email: json.client_email, private_key: String(json.private_key).replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export const fcmConfigured = () => serviceAccount() !== null;

// Google cambia un JWT firmado con la clave de la cuenta de servicio por un token de una hora.
let cached: { token: string; exp: number } | null = null;
async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`Firebase no dio acceso (${res.status}): ${json.error_description ?? json.error ?? "sin detalle"}`);
  cached = { token: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

// Manda a cada token; devuelve cuántos salieron y los tokens que ya no existen (para borrarlos).
export async function sendFcm(tokens: string[], payload: PushPayload): Promise<{ sent: number; dead: string[] }> {
  const sa = serviceAccount();
  if (!sa || tokens.length === 0) return { sent: 0, dead: [] };
  let bearer: string;
  try {
    bearer = await accessToken(sa);
  } catch (e) {
    console.error("[fcm]", (e as Error).message);
    return { sent: 0, dead: [] };
  }

  const data: Record<string, string> = { url: payload.url ?? "/" };
  if (payload.tag) data.tag = payload.tag;
  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
          method: "POST",
          headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: payload.title, body: payload.body },
              data,
              android: {
                priority: "high",
                ttl: `${60 * 60 * 6}s`,
                // Mismo tag = reemplaza al aviso anterior en vez de apilarse (como en la web).
                notification: { channel_id: FCM_CHANNEL, icon: "ic_stat_lovebug", color: "#FF5A5F", ...(payload.tag ? { tag: payload.tag } : {}) },
              },
            },
          }),
          cache: "no-store",
        });
        if (res.ok) {
          sent++;
          return;
        }
        const err = (await res.json().catch(() => ({}))) as { error?: { status?: string; message?: string; details?: { errorCode?: string }[] } };
        const code = err.error?.details?.find((d) => d.errorCode)?.errorCode;
        const invalid = code === "INVALID_ARGUMENT" && /registration token/i.test(err.error?.message ?? "");
        if (code === "UNREGISTERED" || res.status === 404 || invalid) dead.push(token);
        else console.error("[fcm] error", res.status, code ?? err.error?.status, err.error?.message);
      } catch (e) {
        console.error("[fcm] error", (e as Error).message);
      }
    })
  );
  return { sent, dead };
}
