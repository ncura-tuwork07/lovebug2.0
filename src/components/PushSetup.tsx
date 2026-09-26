"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { nativePushReady, removeNativePushToken, removePushSubscription, saveNativePushToken, savePushSubscription, sendTestPush } from "@/app/actions/push";
import { nativeAppWithoutPush, nativePushAvailable, nativePushPermission, nativePushToken, registerNativePush, rememberNativePush, unregisterNativePush } from "@/lib/native";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "app-pending" | "denied" | "off" | "on" | "working";

export function PushSetup() {
  const [status, setStatus] = useState<Status>("working");
  const [msg, setMsg] = useState<string | null>(null);
  const [native, setNative] = useState(false); // app de Android: los avisos van por Firebase

  useEffect(() => {
    (async () => {
      if (nativeAppWithoutPush()) {
        setStatus("app-pending");
        return;
      }
      if (nativePushAvailable()) {
        setNative(true);
        if (!(await nativePushReady())) {
          setStatus("app-pending");
          return;
        }
        const permission = await nativePushPermission();
        setStatus(permission === "denied" ? "denied" : permission === "granted" && nativePushToken() ? "on" : "off");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function enableNative() {
    setStatus("working");
    setMsg(null);
    try {
      const token = await registerNativePush();
      await saveNativePushToken(token, navigator.userAgent.slice(0, 200));
      rememberNativePush(token);
      setStatus("on");
      setMsg("Listo. Te mando uno de prueba…");
      setMsg((await sendTestPush()) ?? "Avisos activados en este celu.");
    } catch (e) {
      if ((e as { code?: string }).code === "denied") {
        setStatus("denied");
        return;
      }
      setStatus(nativePushToken() ? "on" : "off");
      setMsg(e instanceof Error ? e.message : "No pudimos activar los avisos.");
    }
  }

  async function disableNative() {
    setStatus("working");
    const token = await unregisterNativePush();
    if (token) await removeNativePushToken(token).catch(() => {});
    setStatus("off");
    setMsg("Avisos desactivados en este celu.");
  }

  async function enable() {
    if (native) return enableNative();
    setStatus("working");
    setMsg(null);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Falta configurar las claves de notificaciones en el servidor.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        user_agent: navigator.userAgent.slice(0, 200),
      });
      setStatus("on");
      setMsg("Listo. Te mando una de prueba…");
      setMsg((await sendTestPush()) ?? "Avisos activados en este dispositivo.");
    } catch (e) {
      setStatus("off");
      setMsg(e instanceof Error ? e.message : "No pudimos activar los avisos.");
    }
  }

  async function disable() {
    if (native) return disableNative();
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setMsg("Avisos desactivados en este dispositivo.");
    } catch {
      setStatus("on");
    }
  }

  if (status === "app-pending") {
    return (
      <section className="lb-card flex items-center gap-3 !p-3">
        <BellOff size={18} className="shrink-0 text-ink-ghost" />
        <p className="text-sm text-ink-faint">
          En la app todavía no llegan avisos al celu. Mientras tanto, la campanita de arriba te junta todo lo que vence, los cumples y los traslados del día.
        </p>
      </section>
    );
  }

  if (status === "unsupported") {
    return (
      <section className="lb-card flex items-center gap-3 !p-3">
        <BellOff size={18} className="shrink-0 text-ink-ghost" />
        <p className="text-sm text-ink-faint">
          Este navegador no soporta avisos. En iPhone, primero instalá Lovebug en la pantalla de inicio y abrila desde ahí.
        </p>
      </section>
    );
  }

  return (
    <section className="lb-card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${status === "on" ? "bg-success-soft text-success" : "bg-amber-soft text-amber"}`}>
          {status === "on" ? <BellRing size={18} /> : <Bell size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-item font-medium text-ink">Avisos en este celu</p>
          <p className="text-meta text-ink-faint">
            {status === "on"
              ? "Activados: vencimientos, traslados en 1 hora, cumples y el resumen del domingo."
              : status === "denied"
                ? native
                  ? "Bloqueaste las notificaciones de Lovebug. Habilitalas en Ajustes del celu → Apps → Lovebug → Notificaciones."
                  : "Bloqueaste las notificaciones. Habilitalas en los ajustes del navegador para este sitio."
                : "Te avisamos cuando algo vence, cuando sale un traslado y los domingos con el resumen."}
          </p>
        </div>
      </div>
      {status !== "denied" && (
        <button
          type="button"
          onClick={status === "on" ? disable : enable}
          disabled={status === "working"}
          className={`min-h-11 rounded-md text-sm font-semibold ${status === "on" ? "border-[1.5px] border-line text-ink-faint" : "lb-btn"} disabled:opacity-60`}
        >
          {status === "working" ? "Un momento…" : status === "on" ? "Desactivar en este celu" : "Activar avisos"}
        </button>
      )}
      {msg && <p className="text-meta text-ink-faint">{msg}</p>}
    </section>
  );
}
