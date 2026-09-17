"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackUsage } from "@/app/actions/household";

// Registra qué pantallas se usan y si la app está instalada (solo métricas agregadas del panel de admin).
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
    trackUsage(pathname, installed).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const onInstalled = () => trackUsage(window.location.pathname, true).catch(() => {});
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
