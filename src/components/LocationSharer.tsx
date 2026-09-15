"use client";

import { useEffect, useRef } from "react";
import { updateMyLocation } from "@/app/actions/location";

// Mientras la app está abierta y el perfil tiene "compartir ubicación" activo,
// manda la posición al servidor cada ~20 s o cuando se movió más de 30 m.
export function LocationSharer({ memberId, enabled }: { memberId: string | null; enabled: boolean }) {
  const last = useRef<{ lat: number; lng: number; at: number } | null>(null);

  useEffect(() => {
    if (!enabled || !memberId || typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    const send = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const now = Date.now();
      const prev = last.current;
      const moved = prev ? Math.hypot((lat - prev.lat) * 111_000, (lng - prev.lng) * 111_000 * Math.cos((lat * Math.PI) / 180)) : Infinity;
      if (prev && now - prev.at < 20_000 && moved < 30) return;
      last.current = { lat, lng, at: now };
      updateMyLocation(memberId, lat, lng, Number.isFinite(accuracy) ? Math.round(accuracy) : null).catch(() => {});
    };

    const id = navigator.geolocation.watchPosition(send, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 20_000,
    });
    return () => navigator.geolocation.clearWatch(id);
  }, [memberId, enabled]);

  return null;
}
