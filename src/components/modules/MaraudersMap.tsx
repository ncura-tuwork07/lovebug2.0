"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { IM_Fell_English, IM_Fell_English_SC } from "next/font/google";
import type { Member } from "@/lib/types";
import { PRESENCE_FRESH_MS, usedCols, usedRows, type HomeMove, type Presence, type Room } from "@/lib/home";

// El Mapa del Merodeador: la casa dibujada en tinta sobre pergamino, con el nombre de cada uno
// sobre sus pies. Cuando alguien cambia de ambiente, sus pisadas cruzan el mapa y se borran solas.
// Se abre jurando solemnemente y se cierra con "¡Travesura realizada!".

const fell = IM_Fell_English({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], display: "swap" });
const fellSC = IM_Fell_English_SC({ weight: "400", subsets: ["latin"], display: "swap" });

const U = 10; // unidades del dibujo por metro (cuadradito del plano)
const INK = "#3B2410";
const PAPER = "#F3E6C4";
const MARGIN = 6;
const TOP = 14; // lugar arriba del plano: por ahí se entra y se sale de la casa (arriba es el frente)
const STEP_MS = 240; // cada paso
const FOOT_MS = 4200; // lo que tarda en borrarse una pisada
const REPLAY_MS = 15 * 60_000; // al abrir el mapa se ven caminar los que se movieron hace poco
const REVEAL_MS = 1500; // lo que tarda la tinta en aparecer

type Pt = { x: number; y: number };
type Trail = { key: string; memberId: string; a: Pt; c: Pt; b: Pt; start: number; steps: number; exits: boolean };

// Suela y talón de un pie derecho mirando "hacia arriba" (medidas en largos de pie).
const FOOT_PATH =
  "M0.05,-0.5C0.2,-0.5 0.27,-0.33 0.26,-0.14C0.25,0.02 0.18,0.1 0.15,0.17L-0.1,0.17C-0.15,0.1 -0.22,0.02 -0.22,-0.14C-0.22,-0.34 -0.12,-0.5 0.05,-0.5Z" +
  "M0.02,0.24C0.13,0.24 0.16,0.33 0.15,0.4C0.13,0.5 -0.1,0.5 -0.12,0.4C-0.13,0.33 -0.09,0.24 0.02,0.24Z";

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function bezier(a: Pt, c: Pt, b: Pt, t: number): Pt {
  return lerp(lerp(a, c, t), lerp(c, b, t), t);
}
// Puntos a igual distancia sobre la curva (con su dirección), para poner las pisadas parejas.
function walk(a: Pt, c: Pt, b: Pt, n: number): { p: Pt; angle: number }[] {
  const samples = Array.from({ length: 61 }, (_, i) => bezier(a, c, b, i / 60));
  const acc = [0];
  for (let i = 1; i < samples.length; i++) acc.push(acc[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  const total = acc[acc.length - 1] || 1;
  return Array.from({ length: n }, (_, k) => {
    const target = ((k + 0.5) / n) * total;
    let i = acc.findIndex((d) => d >= target);
    if (i < 1) i = 1;
    const t = (i - 1 + (target - acc[i - 1]) / (acc[i] - acc[i - 1] || 1)) / 60;
    const p = bezier(a, c, b, t);
    const q = bezier(a, c, b, Math.min(1, t + 0.01));
    const r = bezier(a, c, b, Math.max(0, t - 0.01));
    return { p, angle: Math.atan2(q.y - r.y, q.x - r.x) };
  });
}
// Largo aproximado de la curva (alcanza para decidir cuántos pasos da).
const curveLength = (a: Pt, c: Pt, b: Pt) => (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y)) / 2;

const short = (m: Member) => m.nickname?.trim() || m.name.split(" ")[0];
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function MaraudersMap({
  rooms,
  allRooms,
  members,
  presence,
  moves,
  householdName,
  onRoom,
  onPerson,
}: {
  rooms: Room[]; // los del piso que se ve
  allRooms: Room[];
  members: Member[];
  presence: Presence[];
  moves: HomeMove[];
  householdName: string | null;
  onRoom: (room: Room) => void;
  onPerson: (member: Member) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [phase, setPhase] = useState<"sealed" | "open" | "closing">("sealed");
  const [openedAt, setOpenedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [live, setLive] = useState<HomeMove[]>([]);
  const prevPresence = useRef<Map<string, string | null> | null>(null);
  const starts = useRef(new Map<string, number>());
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Si alguien cambia de ambiente con el mapa abierto (llega por tiempo real), camina en vivo aunque
  // la base todavía no tenga las pisadas guardadas.
  useEffect(() => {
    const map = new Map(presence.map((p) => [p.member_id, p.room_id]));
    const prev = prevPresence.current;
    prevPresence.current = map;
    if (!prev) return;
    const changed: HomeMove[] = [];
    for (const [memberId, roomId] of map) {
      if (prev.has(memberId) && prev.get(memberId) !== roomId) changed.push({ member_id: memberId, from_room: prev.get(memberId) ?? null, to_room: roomId, moved_at: new Date().toISOString() });
      if (!prev.has(memberId)) changed.push({ member_id: memberId, from_room: null, to_room: roomId, moved_at: new Date().toISOString() });
    }
    if (changed.length) setLive((l) => [...l.filter((x) => !changed.some((c) => c.member_id === x.member_id)), ...changed]);
  }, [presence]);

  const cols = usedCols(rooms);
  const rows = usedRows(rooms);
  const vbW = cols * U + MARGIN * 2;
  const vbH = rows * U + MARGIN + TOP;
  const drawW = Math.max(200, width - 24); // el pergamino tiene 12 px de margen a cada lado
  const k = vbW / drawW; // unidades del dibujo por píxel de pantalla
  const px = (n: number) => n * k;
  const foot = Math.max(3.2, px(13)); // largo del pie
  const floorIds = useMemo(() => new Set(rooms.map((r) => r.id)), [rooms]);

  // Dónde se para cada uno: repartidos dentro de su ambiente, debajo del nombre del ambiente.
  const spots = useMemo(() => {
    const out = new Map<string, Pt>();
    for (const r of rooms) {
      const inRoom = members.filter((m) => presence.find((p) => p.member_id === m.id)?.room_id === r.id);
      if (!inRoom.length) continue;
      const pad = Math.min(U * 0.6, (r.w * U) / 4);
      const labelH = Math.min(px(16), (r.h * U) / 2.5);
      const x0 = r.x * U + pad;
      const x1 = (r.x + r.w) * U - pad;
      const y0 = r.y * U + labelH;
      const y1 = (r.y + r.h) * U - pad;
      const perRow = Math.ceil(Math.sqrt(inRoom.length * ((x1 - x0) / Math.max(1, y1 - y0))));
      const c = Math.max(1, Math.min(inRoom.length, perRow));
      const rr = Math.ceil(inRoom.length / c);
      inRoom.forEach((m, i) => {
        // Los que quedan uno al lado del otro, un poquito corridos para que no se pisen los carteles.
        const stagger = c > 1 && (i % c) % 2 ? foot * 1.5 : 0;
        out.set(m.id, { x: x0 + ((i % c) + 0.5) * ((x1 - x0) / c), y: y0 + (Math.floor(i / c) + 0.5) * ((y1 - y0) / rr) + foot * 0.4 + stagger });
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, members, presence, k]);

  const center = (r: Room): Pt => ({ x: (r.x + r.w / 2) * U, y: (r.y + r.h / 2) * U });
  const roomById = (id: string | null) => allRooms.find((r) => r.id === id) ?? null;

  // Última pisada de cada uno (guardada o vista en vivo) → un camino de A a B.
  const trails = useMemo(() => {
    const nowMs = Date.now();
    const latest = new Map<string, HomeMove & { live?: boolean }>();
    for (const m of moves) {
      const cur = latest.get(m.member_id);
      if (!cur || Date.parse(m.moved_at) > Date.parse(cur.moved_at)) latest.set(m.member_id, m);
    }
    for (const m of live) {
      const cur = latest.get(m.member_id);
      // Si la base ya guardó el mismo cambio, seguimos con el de en vivo (así no camina dos veces).
      const same = cur && cur.to_room === m.to_room && Math.abs(Date.parse(cur.moved_at) - Date.parse(m.moved_at)) < 3 * 60_000;
      if (!cur || same || Date.parse(m.moved_at) > Date.parse(cur.moved_at)) latest.set(m.member_id, { ...m, live: true });
    }
    const out: Trail[] = [];
    members.forEach((member, idx) => {
      const mv = latest.get(member.id);
      if (!mv || (!mv.live && nowMs - Date.parse(mv.moved_at) > REPLAY_MS)) return;
      const from = roomById(mv.from_room);
      const to = roomById(mv.to_room);
      const fromHere = from && floorIds.has(from.id);
      const toHere = to && floorIds.has(to.id);
      if (!fromHere && !toHere) return;
      const b: Pt = toHere ? (spots.get(member.id) ?? center(to!)) : fromHere && !to ? { x: center(from!).x, y: -TOP + 2 } : { x: center(from!).x + U * 1.5, y: center(from!).y - U * 1.5 };
      const a: Pt = fromHere ? center(from!) : !from ? { x: b.x, y: -TOP + 2 } : { x: b.x - U * 1.5, y: b.y - U * 1.5 };
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist < foot) return;
      const bend = (idx % 2 ? 1 : -1) * 0.18 * dist;
      const mid = lerp(a, b, 0.5);
      const c: Pt = { x: mid.x - ((b.y - a.y) / dist) * bend, y: mid.y + ((b.x - a.x) / dist) * bend };
      out.push({ key: `${member.id}:${mv.moved_at}`, memberId: member.id, a, b, c, start: 0, steps: Math.max(3, Math.min(40, Math.round(curveLength(a, c, b) / (foot * 1.1)))), exits: !toHere });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, live, members, spots, floorIds, allRooms, foot]);

  // Cuándo arranca a caminar cada uno: los recientes, uno detrás del otro después de que aparece la
  // tinta; los que llegan en vivo, enseguida.
  const t0 = typeof performance === "undefined" ? 0 : performance.now();
  trails.forEach((t, i) => {
    if (!starts.current.has(t.key)) starts.current.set(t.key, phase === "open" && openedAt && t0 - openedAt > REVEAL_MS ? t0 + 150 : openedAt + REVEAL_MS + i * 350);
    t.start = starts.current.get(t.key)!;
  });

  // Mientras alguien camina o quedan pisadas por borrarse, redibujamos cuadro por cuadro.
  const busyUntil = phase === "open" && !reduced.current ? Math.max(0, ...trails.map((t) => t.start + t.steps * STEP_MS + FOOT_MS)) : 0;
  useEffect(() => {
    if (!busyUntil) return;
    let raf = 0;
    const tick = () => {
      const n = performance.now();
      setNow(n);
      if (n < busyUntil) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [busyUntil]);

  function open() {
    // Las pisadas de antes de abrir se vuelven a caminar (se calculan de nuevo al abrir).
    starts.current.clear();
    setOpenedAt(performance.now());
    setPhase("open");
  }
  function close() {
    setPhase("closing");
    setTimeout(() => setPhase("sealed"), 800);
  }

  const walking = (memberId: string) => {
    const t = trails.find((x) => x.memberId === memberId);
    if (!t || reduced.current || phase !== "open") return null;
    const done = (now - t.start) / (t.steps * STEP_MS);
    if (done >= 1) return t.exits ? { gone: true as const } : null;
    if (done < 0) return { at: t.a, angle: 0 }; // esperando su turno para caminar
    const pts = walk(t.a, t.c, t.b, 24);
    const p = pts[Math.min(pts.length - 1, Math.floor(done * pts.length))];
    return { at: p.p, angle: p.angle };
  };

  const fresh = (memberId: string) => {
    const p = presence.find((x) => x.member_id === memberId);
    return p ? Date.now() - Date.parse(p.updated_at) < PRESENCE_FRESH_MS : false;
  };
  const outside = members.filter((m) => presence.some((p) => p.member_id === m.id && p.room_id === null));
  const untracked = members.filter((m) => !presence.some((p) => p.member_id === m.id));
  const otherFloor = members.filter((m) => {
    const r = roomById(presence.find((p) => p.member_id === m.id)?.room_id ?? null);
    return r && !floorIds.has(r.id);
  });
  const authors = members.slice(0, 5).map(short);
  const press = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const ribbon = (name: string, at: Pt, faded: boolean, key: string, member: Member) => {
    const fs = px(12.5);
    const w = name.length * fs * 0.52 + fs * 1.6;
    const h = fs * 1.45;
    const y = at.y - foot * 0.9 - h;
    const notch = h * 0.35;
    return (
      <g
        key={key}
        role="button"
        tabIndex={0}
        aria-label={`${member.name}: preguntarle dónde está o llamarlo`}
        onClick={() => onPerson(member)}
        onKeyDown={press(() => onPerson(member))}
        className="cursor-pointer outline-none"
        opacity={faded ? 0.5 : 1}
      >
        <rect x={at.x - w / 2 - px(6)} y={y - px(6)} width={w + px(12)} height={h + foot * 1.4 + px(10)} fill="transparent" />
        <path
          d={`M${at.x - w / 2 - notch},${y} L${at.x + w / 2 + notch},${y} L${at.x + w / 2},${y + h / 2} L${at.x + w / 2 + notch},${y + h} L${at.x - w / 2 - notch},${y + h} L${at.x - w / 2},${y + h / 2} Z`}
          fill={PAPER}
          stroke={INK}
          strokeWidth={px(0.9)}
        />
        <text x={at.x} y={y + h * 0.72} textAnchor="middle" fontSize={fs} fill={INK} fontStyle="italic" className={fell.className}>
          {name}
        </text>
      </g>
    );
  };

  const feetAt = (at: Pt, angle: number, still: boolean, key: string) => {
    const rot = (angle * 180) / Math.PI + 90;
    const side = foot * 0.24;
    return (
      <g key={key} transform={`translate(${at.x} ${at.y}) rotate(${rot})`} fill={INK} pointerEvents="none">
        <path d={FOOT_PATH} transform={`translate(${-side} 0) scale(${-foot} ${foot}) rotate(-6)`} className={still ? "lb-mm-foot" : undefined} />
        <path d={FOOT_PATH} transform={`translate(${side} ${foot * 0.12}) scale(${foot}) rotate(6)`} className={still ? "lb-mm-foot" : undefined} style={still ? { animationDelay: "1.3s" } : undefined} />
      </g>
    );
  };

  return (
    <div
      ref={box}
      className={`relative w-full overflow-hidden rounded-[6px] ${fell.className}`}
      style={{
        color: INK,
        background: [
          "radial-gradient(ellipse at 22% 18%, rgba(160,110,40,.18), transparent 38%)",
          "radial-gradient(ellipse at 80% 85%, rgba(150,95,35,.2), transparent 40%)",
          "radial-gradient(ellipse at 50% 45%, rgba(255,250,232,.65), transparent 70%)",
          "radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(110,70,25,.42) 100%)",
          // Los dobleces del pergamino
          "linear-gradient(90deg, transparent calc(33.3% - 3px), rgba(90,60,20,.13) calc(33.3% - 1px), rgba(255,255,240,.35) calc(33.3% + 1px), transparent calc(33.3% + 4px))",
          "linear-gradient(90deg, transparent calc(66.6% - 3px), rgba(90,60,20,.13) calc(66.6% - 1px), rgba(255,255,240,.35) calc(66.6% + 1px), transparent calc(66.6% + 4px))",
          "#E8D5A6",
        ].join(", "),
        boxShadow: "inset 0 0 0 1px rgba(90,60,20,.35), 0 6px 18px rgba(60,40,10,.25)",
      }}
    >
      {/* Grano del papel */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-40 mix-blend-multiply">
        <filter id={`${uid}-paper`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" />
          <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.3  0 0 0 0 0.14  0 0 0 0.55 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${uid}-paper)`} />
      </svg>

      <div
        key={openedAt}
        aria-hidden={phase === "sealed"}
        className="relative flex flex-col gap-2 px-3 pb-3 pt-4 transition-opacity duration-700"
        style={{ opacity: phase === "open" ? 1 : 0, visibility: phase === "sealed" ? "hidden" : "visible" }}
      >
        <header className={`${phase === "open" ? "lb-mm-in" : ""} text-center leading-tight`}>
          <p className={`${fellSC.className} text-[13px] tracking-wide`}>{joinNames(authors)}</p>
          <p className="text-[12px] italic">proveedores de artículos para familias traviesas, se enorgullecen en presentar el</p>
          <p className={`${fellSC.className} mt-1 text-[26px] leading-none`}>Mapa del Merodeador</p>
          {householdName && <p className="mt-0.5 text-[13px] italic">de {householdName}</p>}
          <p aria-hidden className="mt-1 text-[12px] tracking-[0.4em]">~ ✦ ~</p>
        </header>

        <svg viewBox={`${-MARGIN} ${-TOP} ${vbW} ${vbH}`} className="w-full" style={{ height: (vbH / vbW) * drawW }} role="group" aria-label="Plano de la casa">
          <defs>
            <filter id={`${uid}-ink`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" />
              <feDisplacementMap in="SourceGraphic" scale={px(2.4)} />
            </filter>
          </defs>
          <g filter={`url(#${uid}-ink)`}>
            {rooms.map((r, i) => {
              const open = r.kind === "patio" || r.kind === "balcon";
              const inset = px(2.4);
              return (
                <g key={r.id} role="button" tabIndex={0} aria-label={r.name} onClick={() => onRoom(r)} onKeyDown={press(() => onRoom(r))} className="cursor-pointer outline-none">
                  <rect x={r.x * U} y={r.y * U} width={r.w * U} height={r.h * U} fill="rgba(120,80,30,0.04)" />
                  <rect
                    x={r.x * U}
                    y={r.y * U}
                    width={r.w * U}
                    height={r.h * U}
                    fill="none"
                    stroke={INK}
                    strokeWidth={px(open ? 1 : 1.6)}
                    strokeDasharray={open ? `${px(4)} ${px(3)}` : undefined}
                    pathLength={open ? undefined : 1}
                    className={open || phase !== "open" ? undefined : "lb-mm-wall"}
                    style={{ animationDelay: `${i * 90}ms` }}
                  />
                  {!open && r.w * U > inset * 3 && r.h * U > inset * 3 && (
                    <rect
                      x={r.x * U + inset}
                      y={r.y * U + inset}
                      width={r.w * U - inset * 2}
                      height={r.h * U - inset * 2}
                      fill="none"
                      stroke={INK}
                      strokeWidth={px(0.6)}
                      pathLength={1}
                      className={phase === "open" ? "lb-mm-wall" : undefined}
                      style={{ animationDelay: `${200 + i * 90}ms` }}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {rooms.map((r) => {
            const fs = Math.min(px(14), (r.w * U * 1.7) / Math.max(4, r.name.length));
            return (
              <text
                key={`n-${r.id}`}
                x={(r.x + r.w / 2) * U}
                y={r.y * U + Math.min(px(15), (r.h * U) / 2.6)}
                textAnchor="middle"
                fontSize={fs}
                fill={INK}
                pointerEvents="none"
                className={`${fellSC.className} ${phase === "open" ? "lb-mm-in" : ""}`}
                style={{ animationDelay: "700ms" }}
              >
                {r.name}
              </text>
            );
          })}

          {/* Pisadas: aparecen paso a paso y se borran solas */}
          {phase === "open" &&
            !reduced.current &&
            trails.flatMap((t) =>
              walk(t.a, t.c, t.b, t.steps).map(({ p, angle }, i) => {
                const age = now - (t.start + i * STEP_MS);
                if (age < 0 || age > FOOT_MS) return null;
                const opacity = age < 160 ? age / 160 : age < FOOT_MS * 0.55 ? 1 : Math.max(0, 1 - (age - FOOT_MS * 0.55) / (FOOT_MS * 0.45));
                const left = i % 2 === 0;
                const nx = -Math.sin(angle) * foot * 0.26 * (left ? -1 : 1);
                const ny = Math.cos(angle) * foot * 0.26 * (left ? -1 : 1);
                return (
                  <path
                    key={`${t.key}:${i}`}
                    d={FOOT_PATH}
                    fill={INK}
                    opacity={opacity * 0.85}
                    pointerEvents="none"
                    transform={`translate(${p.x + nx} ${p.y + ny}) rotate(${(angle * 180) / Math.PI + 90}) scale(${left ? -foot : foot} ${foot})`}
                  />
                );
              })
            )}

          {/* Cada uno, con su cartelito de nombre */}
          {members.map((m) => {
            const w = walking(m.id);
            if (w && "gone" in w) return null;
            const spot = spots.get(m.id);
            const at = w?.at ?? spot;
            if (!at) return null;
            const faded = !w && !fresh(m.id);
            return (
              <g key={m.id} className={phase === "open" ? "lb-mm-in" : undefined} style={{ animationDelay: "1100ms" }}>
                {!w && feetAt(at, -Math.PI / 2, true, `f-${m.id}`)}
                {ribbon(short(m), at, faded, `r-${m.id}`, m)}
              </g>
            );
          })}
        </svg>

        <footer className={`${phase === "open" ? "lb-mm-in" : ""} flex items-end justify-between gap-3 text-[12px] italic`} style={{ animationDelay: "1200ms" }}>
          <div className="min-w-0 leading-snug">
            {outside.length > 0 && <p>Fuera de casa: {joinNames(outside.map(short))}</p>}
            {otherFloor.length > 0 && <p>En otro piso: {joinNames(otherFloor.map(short))}</p>}
            {untracked.length > 0 && <p>Sin rastro: {joinNames(untracked.map(short))}</p>}
          </div>
          <button type="button" onClick={close} className={`${fellSC.className} min-h-10 shrink-0 rounded-sm border px-3 text-[14px] not-italic`} style={{ borderColor: INK }}>
            ¡Travesura realizada!
          </button>
        </footer>
      </div>

      {phase !== "open" && (
        <button
          type="button"
          onClick={open}
          disabled={phase === "closing"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center"
          style={{ opacity: phase === "sealed" ? 1 : 0, transition: "opacity .6s" }}
        >
          <span aria-hidden className="text-3xl">🪄</span>
          <span className="text-[22px] italic leading-snug">“Juro solemnemente que mis intenciones no son buenas”</span>
          <span className="text-[13px] opacity-75">Tocá para abrir el mapa</span>
        </button>
      )}
    </div>
  );
}
