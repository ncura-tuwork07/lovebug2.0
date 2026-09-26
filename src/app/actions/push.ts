"use server";

import { createClient } from "@/lib/supabase/server";

export type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  user_agent: string | null;
};

export async function savePushSubscription(sub: SubscriptionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que estar logueado.");
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: sub.user_agent,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

// Manda una notificación de prueba a los dispositivos del usuario actual. Devuelve el problema (o
// null si salió): los errores que tira una acción no llegan a la pantalla en producción.
export async function sendTestPush(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Tenés que estar logueado.";
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", user.id);
  if (!subs?.length) return "Este dispositivo todavía no está suscripto.";
  const { sendPushToSubscriptions } = await import("@/lib/push");
  const sent = await sendPushToSubscriptions(subs, {
    title: "Lovebug 🐞",
    body: "¡Los avisos funcionan! Así te van a llegar los vencimientos y traslados.",
    url: "/",
    tag: "test",
  });
  return sent === 0 ? "Quedaron activados, pero el aviso de prueba no salió. Probá desactivar y activar de nuevo en un rato." : null;
}

// ¿El servidor ya puede mandar avisos a la app de Android? Hace falta la cuenta de Firebase en Vercel.
export async function nativePushReady(): Promise<boolean> {
  const { fcmConfigured } = await import("@/lib/fcm");
  return fcmConfigured();
}

// La app de Android guarda su token de Firebase como una suscripción más ("fcm:<token>").
export async function saveNativePushToken(token: string, userAgent: string | null) {
  if (!/^[\w:-]{20,4096}$/.test(token)) throw new Error("Token inválido.");
  const { FCM_PREFIX } = await import("@/lib/fcm");
  await savePushSubscription({ endpoint: FCM_PREFIX + token, keys: { p256dh: "fcm", auth: "fcm" }, user_agent: userAgent });
}

export async function removeNativePushToken(token: string) {
  const { FCM_PREFIX } = await import("@/lib/fcm");
  await removePushSubscription(FCM_PREFIX + token);
}
