"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { removeNativePushToken, saveNativePushToken } from "@/app/actions/push";
import { nativePushAvailable, nativePushPermission, nativePushToken, onNativePushTap, registerNativePush, rememberNativePush } from "@/lib/native";

// En la app de Android: tocar un aviso lleva a su pantalla, y al abrir la app refrescamos el token
// de Firebase (puede cambiar) si los avisos están activados en este celu. En la web no hace nada.
export function NativePushBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!nativePushAvailable()) return;
    const off = onNativePushTap((url) => router.push(url));
    const saved = nativePushToken();
    if (saved) {
      (async () => {
        if ((await nativePushPermission()) !== "granted") return;
        const token = await registerNativePush();
        await saveNativePushToken(token, navigator.userAgent.slice(0, 200));
        rememberNativePush(token);
        if (token !== saved) await removeNativePushToken(saved);
      })().catch(() => {});
    }
    return off;
  }, [router]);

  return null;
}
