"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Cuando el otro vuelve a la app (cambia de pestaña, desbloquea el celu), recarga los datos del
// servidor para ver lo que cargó el otro — y de paso el middleware revisa el bloqueo por huella.
// Solo si estuvo afuera un rato: bajar las notificaciones o cerrar el cartel de la huella no
// tiene que recargar toda la pantalla (antes recargaba dos veces cada vez).
const AWAY_MS = 15_000;

export function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= AWAY_MS) router.refresh();
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  return null;
}
