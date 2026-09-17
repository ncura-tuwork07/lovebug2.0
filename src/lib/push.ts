import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

type Sub = { endpoint: string; p256dh: string; auth: string };

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hola@lovebug.app", pub, priv);
  configured = true;
  return true;
}

// Envía a una lista de suscripciones; limpia las que ya no existen (410/404).
export async function sendPushToSubscriptions(subs: Sub[], payload: PushPayload): Promise<number> {
  if (!configure() || subs.length === 0) return 0;
  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 6,
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
        else console.error("[push] error", status, (e as Error).message);
      }
    })
  );

  if (dead.length) {
    const admin = createAdminClient();
    if (admin) await admin.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return sent;
}

// Envía a todos los dispositivos de un hogar (o de un usuario en particular).
export async function broadcastPush(payload: PushPayload, target: { householdId?: string; userId?: string } = {}): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  let q = admin.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (target.householdId) q = q.eq("household_id", target.householdId);
  if (target.userId) q = q.eq("user_id", target.userId);
  const { data } = await q;
  return sendPushToSubscriptions((data ?? []) as Sub[], payload);
}
