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

// Manda una notificación de prueba a los dispositivos del usuario actual.
export async function sendTestPush() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tenés que estar logueado.");
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", user.id);
  if (!subs?.length) throw new Error("Este dispositivo todavía no está suscripto.");
  const { sendPushToSubscriptions } = await import("@/lib/push");
  const sent = await sendPushToSubscriptions(subs, {
    title: "Lovebug 🐞",
    body: "¡Los avisos funcionan! Así te van a llegar los vencimientos y traslados.",
    url: "/",
    tag: "test",
  });
  if (sent === 0) throw new Error("No pudimos enviar. Revisá los permisos de notificaciones.");
}
