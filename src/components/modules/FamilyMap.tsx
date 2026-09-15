"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LocateFixed, MapPin } from "lucide-react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Member, MemberLocation } from "@/lib/types";
import { useRealtimeTable } from "@/components/useRealtime";
import { MemberAvatar } from "@/components/ui/MemberChip";

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function FamilyMap({
  members,
  locations,
  myId,
  mySharing,
}: {
  members: Member[];
  locations: MemberLocation[];
  myId: string | null;
  mySharing: boolean;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const [locs, setLocs] = useState<Record<string, MemberLocation>>(() =>
    Object.fromEntries(locations.map((l) => [l.member_id, l]))
  );
  const [ready, setReady] = useState(false);

  // Realtime: cada cambio en locations actualiza el estado local.
  useRealtimeTable("locations", (payload) => {
    if (payload.eventType === "DELETE") {
      const old = payload.old as Partial<MemberLocation>;
      if (old.member_id) {
        setLocs((s) => {
          const next = { ...s };
          delete next[old.member_id!];
          return next;
        });
      }
    } else {
      const row = payload.new as unknown as MemberLocation;
      setLocs((s) => ({ ...s, [row.member_id]: row }));
    }
  });

  // Inicializa el mapa (Leaflet solo en el cliente).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([-34.6, -58.4], 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Sincroniza marcadores con el estado.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current!;
      const present = new Set<string>();

      for (const loc of Object.values(locs)) {
        const m = members.find((x) => x.id === loc.member_id);
        if (!m) continue;
        present.add(m.id);
        const html = `<div style="width:38px;height:38px;border-radius:50%;background:${m.color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font:700 14px Outfit,sans-serif;overflow:hidden">${
          m.photo_url ? `<img src="${m.photo_url}" style="width:100%;height:100%;object-fit:cover" alt="" />` : m.name.slice(0, 1)
        }</div>`;
        const icon = L.divIcon({ html, className: "", iconSize: [38, 38], iconAnchor: [19, 19] });
        const popup = `<b>${m.name}</b><br/>${ago(loc.updated_at)}${loc.accuracy ? ` · ±${Math.round(loc.accuracy)} m` : ""}`;
        if (markers.current[m.id]) {
          markers.current[m.id].setLatLng([loc.lat, loc.lng]).setIcon(icon).setPopupContent(popup);
        } else {
          markers.current[m.id] = L.marker([loc.lat, loc.lng], { icon }).addTo(map).bindPopup(popup);
        }
      }
      for (const id of Object.keys(markers.current)) {
        if (!present.has(id)) {
          markers.current[id].remove();
          delete markers.current[id];
        }
      }
      const pts = Object.values(locs).map((l) => [l.lat, l.lng] as [number, number]);
      if (pts.length > 0 && !map.getBounds().contains(pts[0])) {
        map.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 15 });
      }
    })();
  }, [locs, members, ready]);

  function fitAll() {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then(({ default: L }) => {
      const pts = Object.values(locs).map((l) => [l.lat, l.lng] as [number, number]);
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 15 });
    });
  }

  const sharing = members.filter((m) => locs[m.id]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-card shadow-card" style={{ height: "52dvh", minHeight: 320 }}>
        <div ref={mapEl} className="h-full w-full" />
        <button
          type="button"
          onClick={fitAll}
          aria-label="Ver a todos"
          className="absolute left-3 top-3 z-[400] flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink shadow-card"
        >
          <LocateFixed size={18} />
        </button>
      </div>

      {!mySharing && myId && (
        <Link href={`/familia/${myId}`} className="lb-card flex items-center gap-3 !p-3 !bg-info-soft">
          <MapPin size={18} className="shrink-0 text-info" />
          <span className="text-sm text-ink">
            Todavía no compartís tu ubicación. <span className="font-semibold text-info">Activalo en tu perfil →</span>
          </span>
        </Link>
      )}

      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const loc = locs[m.id];
          return (
            <li key={m.id} className="lb-card flex items-center gap-3 !p-3">
              <MemberAvatar member={m} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-item font-medium text-ink">{m.name}</p>
                <p className="text-meta text-ink-faint">
                  {loc ? `Última ubicación ${ago(loc.updated_at)}` : m.share_location ? "Compartiendo, sin señal todavía" : "No comparte ubicación"}
                </p>
              </div>
              {loc && (
                <button
                  type="button"
                  onClick={() => mapRef.current?.setView([loc.lat, loc.lng], 16)}
                  className="lb-chip min-h-9 text-white"
                  style={{ backgroundColor: m.color }}
                >
                  Ver
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {sharing.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">Nadie está compartiendo ubicación todavía.</p>
      )}
    </div>
  );
}
