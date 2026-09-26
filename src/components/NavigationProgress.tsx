"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LadybugLoader } from "@/components/ui/LadybugLoader";

// Respuesta inmediata al tocar un link interno: si la pantalla nueva tarda en aparecer, a los
// 150 ms sale la mariquita con "Cargando…" arriba, para que nunca parezca que no pasó nada.
// Se va sola cuando cambia la ruta (o a los 15 s, por las dudas).
export function NavigationProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => setPending(false), [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || !a.href) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      setPending(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(false), 15_000);
    return () => clearTimeout(t);
  }, [pending]);

  if (!pending) return null;
  return (
    <div
      className="lb-fade-in pointer-events-none fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top))] z-50 flex justify-center"
      style={{ animationDelay: "150ms" }}
    >
      <div className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-4 shadow-pop">
        <LadybugLoader size={13} label={null} />
        <span className="font-display text-sm font-semibold text-ink-soft">Cargando…</span>
      </div>
    </div>
  );
}
