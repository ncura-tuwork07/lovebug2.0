"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Cuando el otro vuelve a la app (cambia de pestaña, desbloquea el celu),
// recarga los datos del servidor para ver lo que cargó el otro.
export function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);

  return null;
}
