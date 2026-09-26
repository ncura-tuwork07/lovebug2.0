"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function send(path: string, installed: boolean) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, installed }),
    keepalive: true,
  }).catch(() => {});
}

// Registra qué pantallas se usan y si la app está instalada (solo métricas agregadas del panel de admin).
// Se manda un toque después de llegar a la pantalla, para no competir con su carga.
export function UsageTracker() {
  const pathname = usePathname();
  const last = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const now = Date.now();
    if (last.current && last.current.path === pathname && now - last.current.at < 60_000) return;
    last.current = { path: pathname, at: now };
    const installed =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const t = setTimeout(() => send(pathname, installed), 1500);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onInstalled = () => send(window.location.pathname, true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
