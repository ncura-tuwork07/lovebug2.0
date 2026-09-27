"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Footprints, ImagePlus, LogOut, Map as MapIcon, Mic, Pencil, Sparkles, Square, X } from "lucide-react";
import type { Member } from "@/lib/types";
import { deleteRoom, replaceRooms, saveRoom, sendHomePing, setPresence } from "@/app/actions/home";
import { MaraudersMap } from "@/components/modules/MaraudersMap";
import { RoomGrid } from "@/components/modules/RoomGrid";
import { useRealtimeRefresh } from "@/components/useRealtime";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { LadybugLoader } from "@/components/ui/LadybugLoader";
import { useDictation } from "@/components/ui/useDictation";
import { fd, useSheet } from "@/components/ui/useSheet";
import {
  FLOORS,
  floorLabel,
  freeSpot,
  GRID,
  PRESENCE_FRESH_MS,
  ROOM_KINDS,
  ROOM_STYLE,
  pingAnswerText,
  usedCols,
  usedRows,
  type HomeMove,
  type HomePing,
  type PingKind,
  type Presence,
  type Room,
  type RoomDraft,
  type RoomKind,
} from "@/lib/home";

type View = "3d" | "plano" | "magia";
const VIEWS: { key: View; label: string; icon: typeof Box }[] = [
  { key: "3d", label: "3D", icon: Box },
  { key: "plano", label: "Plano", icon: MapIcon },
  { key: "magia", label: "Merodeador", icon: Footprints },
];
type Placed = Omit<Room, "id"> & { id: string };

const VIEW_KEY = "lb-casa-view";
const TILT = 55; // grados de inclinación de la vista 3D
const TURN = 45; // giro, para ver dos paredes del fondo como en los juegos
const SLAB = 5; // espesor del piso en 3D

function ago(iso: string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function HomePlan({
  rooms,
  presence,
  members,
  myId,
  householdName = null,
  pings = null,
  moves = [],
}: {
  rooms: Room[];
  presence: Presence[];
  members: Member[];
  myId: string | null;
  householdName?: string | null;
  pings?: HomePing[] | null; // null = todavía no se corrió la migración 015
  moves?: HomeMove[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("3d");
  const floors = useMemo(() => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b), [rooms]);
  const myRoom = rooms.find((r) => r.id === presence.find((p) => p.member_id === myId)?.room_id);
  const [floor, setFloor] = useState<number>(myRoom?.floor ?? floors[0] ?? 0);
  const [selected, setSelected] = useState<Room | null>(null);
  const [whereFor, setWhereFor] = useState<Member | null>(null);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edit = useSheet<Room>();

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "3d" || v === "plano" || v === "magia") setView(v);
    } catch {}
  }, []);
  function chooseView(v: View) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  }

  // Lo que marcan los demás aparece solo: al instante por tiempo real (con la 015) y, por las dudas,
  // cada 30 s mientras la pantalla está a la vista.
  useRealtimeRefresh("home_presence");
  useRealtimeRefresh("home_pings");
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);

  const floorRooms = rooms.filter((r) => r.floor === floor);
  const presenceOf = (memberId: string) => presence.find((p) => p.member_id === memberId) ?? null;
  const roomOf = (memberId: string) => rooms.find((r) => r.id === presenceOf(memberId)?.room_id) ?? null;

  async function place(memberId: string, roomId: string | null) {
    setBusy(true);
    setError(null);
    try {
      await setPresence(memberId, roomId);
      router.refresh();
      setSelected(null);
      setWhereFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  const here = (roomId: string) => members.filter((m) => presenceOf(m.id)?.room_id === roomId);

  return (
    <div className="flex flex-col gap-4">
      {rooms.length === 0 ? (
        <section className="lb-card flex flex-col gap-3">
          <p className="font-display text-h2 font-bold text-ink">Dibujemos tu casa 🏡</p>
          <p className="text-meta text-ink-faint">
            Mandame fotos de los ambientes y contame cómo es (escrito o hablando), y armo el plano. O lo hacés vos, ambiente por ambiente. Después cada uno marca en qué
            parte de la casa está.
          </p>
          <button type="button" onClick={() => setSketchOpen(true)} className="lb-btn flex min-h-11 items-center justify-center gap-2">
            <Sparkles size={18} /> Dibujarla con IA
          </button>
          <button type="button" onClick={edit.openNew} className="min-h-11 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft">
            Armarla a mano
          </button>
        </section>
      ) : (
        <>
          {/* Quién está dónde */}
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {members.map((m) => {
              const p = presenceOf(m.id);
              const r = roomOf(m.id);
              const fresh = p && Date.now() - Date.parse(p.updated_at) < PRESENCE_FRESH_MS;
              return (
                <li key={m.id} className="shrink-0">
                  <button type="button" onClick={() => setWhereFor(m)} className="lb-card flex items-center gap-2 !px-3 !py-2 text-left">
                    <span className={fresh ? "" : "opacity-50"}>
                      <MemberAvatar member={m} size={28} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-ink">{m.id === myId ? "Vos" : m.name}</span>
                      <span className="text-[11px] text-ink-faint">
                        {!p ? "Sin marcar" : r ? `${ROOM_STYLE[r.kind].emoji} ${r.name} · ${ago(p.updated_at)}` : `Afuera · ${ago(p.updated_at)}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 rounded-md bg-line/60 p-1">
              {VIEWS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseView(key)}
                  aria-pressed={view === key}
                  className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-semibold ${view === key ? "bg-surface text-ink shadow-soft" : "text-ink-faint"}`}
                >
                  <Icon size={15} className="shrink-0" /> {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSketchOpen(true)}
              aria-label="Rehacer el plano con IA"
              title="Rehacer con IA"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-coral"
            >
              <Sparkles size={18} />
            </button>
          </div>

          {floors.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {floors.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFloor(f)}
                  className={`lb-chip min-h-8 shrink-0 !px-3 ${floor === f ? "bg-ink text-cream" : "bg-line/60 text-ink-soft"}`}
                >
                  {floorLabel(f)}
                </button>
              ))}
            </div>
          )}

          {view === "magia" ? (
            <MaraudersMap
              rooms={floorRooms}
              allRooms={rooms}
              members={members}
              presence={presence}
              moves={moves}
              householdName={householdName}
              onRoom={setSelected}
              onPerson={setWhereFor}
            />
          ) : (
            <PlanCanvas rooms={floorRooms} members={members} presence={presence} view={view} onRoom={setSelected} />
          )}
          <p className="text-center text-meta text-ink-faint">
            {pings ? "Tocá a alguien para preguntarle dónde está, o un ambiente para marcar que estás ahí." : "Tocá un ambiente para marcar que estás ahí o para editarlo."}
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Fab onClick={edit.openNew} label="Agregar ambiente" />
        </>
      )}

      {/* Un ambiente: quién está, "estoy acá", traer a alguien, editar */}
      <BottomSheet open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `${ROOM_STYLE[selected.kind].emoji} ${selected.name}` : ""}>
        {selected && (
          <div className="flex flex-col gap-4">
            <p className="text-meta text-ink-faint">
              {here(selected.id).length ? `Acá: ${here(selected.id).map((m) => (m.id === myId ? "vos" : m.name)).join(", ")}.` : "No hay nadie marcado acá."}
            </p>
            {myId && presenceOf(myId)?.room_id !== selected.id && (
              <button type="button" disabled={busy} onClick={() => place(myId, selected.id)} className="lb-btn min-h-12 disabled:opacity-60">
                Estoy acá
              </button>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-label font-bold uppercase tracking-wider text-ink-ghost">Marcar a alguien más acá</p>
              <div className="flex flex-wrap gap-2">
                {members
                  .filter((m) => m.id !== myId && presenceOf(m.id)?.room_id !== selected.id)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      onClick={() => place(m.id, selected.id)}
                      className="flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-line py-1 pl-1 pr-3 text-sm font-semibold text-ink-soft"
                    >
                      <MemberAvatar member={m} size={28} /> {m.name}
                    </button>
                  ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const r = selected;
                setSelected(null);
                edit.openEdit(r);
              }}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft"
            >
              <Pencil size={15} /> Editar ambiente
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Una persona: preguntarle o llamarla, o marcar vos dónde está */}
      <BottomSheet open={Boolean(whereFor)} onClose={() => setWhereFor(null)} title={whereFor ? (whereFor.id === myId ? "¿Dónde estás?" : `¿Dónde está ${whereFor.name}?`) : ""}>
        {whereFor && (
          <div className="flex flex-col gap-3">
            {whereFor.id !== myId && pings && (
              <>
                <PingActions key={whereFor.id} member={whereFor} pings={pings} rooms={rooms} meMarked={Boolean(myId && roomOf(myId))} />
                <p className="mt-1 text-label font-bold uppercase tracking-wider text-ink-ghost">O marcá vos dónde está</p>
              </>
            )}
            <RoomGrid rooms={rooms} current={presenceOf(whereFor.id)?.room_id} disabled={busy} onPick={(r) => place(whereFor.id, r.id)} />
            <button
              type="button"
              disabled={busy}
              onClick={() => place(whereFor.id, null)}
              className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft"
            >
              <LogOut size={15} /> Salió de casa
            </button>
          </div>
        )}
      </BottomSheet>

      <RoomEditor sheet={edit} rooms={rooms} defaultFloor={floor} onSaved={(f) => setFloor(f)} />
      <SketchSheet open={sketchOpen} onClose={() => setSketchOpen(false)} hasRooms={rooms.length > 0} onUsed={(f) => setFloor(f)} />
    </div>
  );
}

// ── "¿Dónde estás?" / "Vení para acá" ─────────────────────────────────────────────────────────
// Le llega un aviso a esa persona y contesta con un toque (ver HomePingInbox). Acá se ve si contestó.
function PingActions({ member, pings, rooms, meMarked }: { member: Member; pings: HomePing[]; rooms: Room[]; meMarked: boolean }) {
  const router = useRouter();
  const [sending, setSending] = useState<PingKind | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = pings.find((p) => p.to_member === member.id); // vienen de la más nueva a la más vieja

  if (!member.user_id) {
    return (
      <p className="rounded-md bg-line/40 px-3 py-2 text-meta text-ink-soft">
        {member.name} no tiene Lovebug en su celu, así que no le puede llegar el aviso. Marcá vos dónde está.
      </p>
    );
  }

  async function send(kind: PingKind) {
    setSending(kind);
    setError(null);
    setNote(null);
    const res = await sendHomePing(member.id, kind).catch(() => ({ ok: false as const, error: "No se pudo mandar. Probá de nuevo." }));
    setSending(null);
    if (!res.ok) return setError(res.error);
    setNote(res.pushed ? `Listo, le llegó el aviso a ${member.name}.` : `Listo. ${member.name} no tiene los avisos activados: lo va a ver apenas abra Lovebug.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={Boolean(sending)} onClick={() => send("donde")} className="lb-btn min-h-12 !px-2 disabled:opacity-60">
          {sending === "donde" ? "Mandando…" : "📍 ¿Dónde estás?"}
        </button>
        <button
          type="button"
          disabled={Boolean(sending)}
          onClick={() => send("veni")}
          className="min-h-12 rounded-md border-[1.5px] border-coral px-2 text-sm font-semibold text-coral disabled:opacity-60"
        >
          {sending === "veni" ? "Mandando…" : "🙋 Vení para acá"}
        </button>
      </div>
      {!meMarked && <p className="text-meta text-ink-faint">Si marcás dónde estás vos, con “Vení para acá” le decimos adónde ir.</p>}
      {note && <p className="text-meta font-semibold text-success">{note}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {last && !note && (
        <p className="text-meta text-ink-soft">
          {pingAnswerText(last, member.name, rooms)} <span className="text-ink-faint">· {ago(last.answered_at ?? last.created_at)}</span>
        </p>
      )}
    </div>
  );
}

// ── El dibujo ────────────────────────────────────────────────────────────────────────────────
// Plano: visto desde arriba. 3D: la misma grilla inclinada y girada, con las paredes del fondo
// de cada ambiente levantadas y la gente "parada" en su ambiente, como en los Sims.
function PlanCanvas({
  rooms,
  members,
  presence,
  view,
  onRoom,
  highlight,
  compact = false,
}: {
  rooms: Placed[];
  members: Member[];
  presence: Presence[];
  view: View;
  onRoom?: (room: Room) => void;
  highlight?: string;
  compact?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = usedCols(rooms);
  const rows = usedRows(rooms);
  const iso = view === "3d";
  // Ancho del plano para que, girado e inclinado, entre justo en la pantalla.
  const planW = iso ? (0.92 * width * Math.SQRT2) / (1 + rows / cols) : width;
  const planH = (planW * rows) / cols;
  const cell = planW / cols;
  const wall = Math.min(18, Math.max(8, cell * 0.85));
  const diag = (planW + planH) / Math.SQRT2;
  const height = iso ? diag * Math.cos((TILT * Math.PI) / 180) + wall + (compact ? 20 : 56) : planH;

  const now = Date.now();
  const people = (roomId: string) =>
    members.flatMap((m) => {
      const p = presence.find((x) => x.member_id === m.id);
      return p?.room_id === roomId ? [{ m, fresh: now - Date.parse(p.updated_at) < PRESENCE_FRESH_MS }] : [];
    });

  // Los carteles flotan apenas por encima de las paredes, así ninguna pared de adelante los tapa.
  const stand: CSSProperties = iso
    ? { transform: `translateZ(${wall + 3}px) rotateZ(-${TURN}deg) rotateX(-${TILT}deg)`, transformStyle: "preserve-3d" }
    : {};

  return (
    <div ref={box} className="relative w-full select-none" style={{ height, perspective: iso ? 2400 : undefined }}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: planW,
          height: planH,
          transform: iso ? `translate(-50%, -50%) translateY(${compact ? 6 : 20}px) rotateX(${TILT}deg) rotateZ(${TURN}deg)` : "translate(-50%, -50%)",
          transformStyle: "preserve-3d",
        }}
      >
        {rooms.map((r) => {
          const style = ROOM_STYLE[r.kind];
          const inRoom = people(r.id);
          const Tag = onRoom ? "button" : "div";
          return (
            <Tag
              key={r.id}
              {...(onRoom ? { type: "button" as const, onClick: () => onRoom(r as Room) } : {})}
              aria-label={`${r.name}${inRoom.length ? `: ${inRoom.map((x) => x.m.name).join(", ")}` : ""}`}
              className="absolute"
              style={{
                left: (r.x / cols) * planW,
                top: (r.y / rows) * planH,
                width: (r.w / cols) * planW,
                height: (r.h / rows) * planH,
                background: style.floor,
                boxShadow: `inset 0 0 0 ${iso ? 2 : 3}px #5B4636${highlight === r.id ? ", inset 0 0 0 6px #FF5A5F" : ""}`,
                opacity: highlight && highlight !== r.id ? 0.55 : 1,
                transformStyle: "preserve-3d",
              }}
            >
              {iso && (
                <>
                  {/* Espesor del piso (los dos bordes que dan al frente) */}
                  <span aria-hidden className="absolute left-0 top-full w-full" style={{ height: SLAB, background: "#6B5443", transformOrigin: "top", transform: "rotateX(-90deg)" }} />
                  <span aria-hidden className="absolute left-full top-0 h-full" style={{ width: SLAB, background: "#57443A", transformOrigin: "left", transform: "rotateY(90deg)" }} />
                </>
              )}
              {iso && r.kind !== "patio" && (
                <>
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 w-full"
                    style={{ height: wall, background: "linear-gradient(#F3EBDD, #E4D6C0)", borderTop: "2px solid #5B4636", transformOrigin: "top", transform: "rotateX(90deg)" }}
                  />
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full"
                    style={{ width: wall, background: "linear-gradient(90deg, #E4D6C0, #D8C7AC)", borderLeft: "2px solid #5B4636", transformOrigin: "left", transform: "rotateY(-90deg)" }}
                  />
                </>
              )}
              {/* Cartel y gente, parados en el medio del ambiente */}
              <span className="absolute left-1/2 top-1/2 h-0 w-0" style={stand}>
                <span className={`absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 ${iso ? "bottom-0" : "-translate-y-1/2"}`}>
                  {!compact && (
                    <span
                      className="truncate whitespace-nowrap rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#3B2F25] shadow-sm"
                      style={{ maxWidth: Math.max(56, (iso ? (r.w + r.h) / Math.SQRT2 : r.w) * cell - 4) }}
                    >
                      {style.emoji} {r.name}
                    </span>
                  )}
                  {inRoom.length > 0 && (
                    <span className="flex -space-x-1.5">
                      {inRoom.map(({ m, fresh }) => (
                        <span key={m.id} className={`rounded-full ring-2 ring-white ${fresh ? "" : "opacity-50"}`}>
                          <MemberAvatar member={m} size={compact ? 16 : 24} />
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

// ── Agregar / editar un ambiente ─────────────────────────────────────────────────────────────
const SIZES = Array.from({ length: 16 }, (_, i) => i + 1);

function RoomEditor({ sheet, rooms, defaultFloor, onSaved }: { sheet: ReturnType<typeof useSheet<Room>>; rooms: Room[]; defaultFloor: number; onSaved: (floor: number) => void }) {
  const editing = sheet.editing;
  const [draft, setDraft] = useState<RoomDraft | null>(null);
  const latest = useRef({ rooms, defaultFloor });
  latest.current = { rooms, defaultFloor };

  // Arranca de lo que se edita, o de un ambiente nuevo en el primer lugar libre del piso. Solo al
  // abrir: el plano se refresca solo cada 30 s y no queremos pisar lo que se está acomodando.
  useEffect(() => {
    if (!sheet.open) return setDraft(null);
    if (editing) return setDraft({ name: editing.name, kind: editing.kind, floor: editing.floor, x: editing.x, y: editing.y, w: editing.w, h: editing.h });
    const { rooms: all, defaultFloor: f } = latest.current;
    const spot = freeSpot(
      all.filter((r) => r.floor === f),
      3,
      3
    );
    setDraft({ name: "", kind: "dormitorio", floor: f, ...spot, w: 3, h: 3 });
  }, [sheet.open, editing]);

  if (!draft) return <BottomSheet open={false} onClose={sheet.close} title="">{null}</BottomSheet>;

  const others = rooms.filter((r) => r.floor === draft.floor && r.id !== editing?.id);
  const set = (patch: Partial<RoomDraft>) =>
    setDraft((d) => {
      if (!d) return d;
      const n = { ...d, ...patch };
      n.w = Math.min(n.w, GRID);
      n.h = Math.min(n.h, GRID);
      n.x = Math.max(0, Math.min(GRID - n.w, n.x));
      n.y = Math.max(0, Math.min(GRID - n.h, n.y));
      return n;
    });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    const room = { ...draft!, name: f.str("name") };
    // Si es nuevo y cambió de piso, que caiga en un lugar libre de ese piso.
    const spot = !editing && room.floor !== defaultFloor ? freeSpot(others, room.w, room.h) : { x: room.x, y: room.y };
    sheet.run(async () => {
      await saveRoom({ ...room, ...spot, id: editing?.id });
      onSaved(room.floor);
    });
  }

  const preview: Placed[] = [...others, { ...draft, id: "__draft__", name: draft.name || ROOM_STYLE[draft.kind].label }];
  const move = (dx: number, dy: number) => set({ x: draft.x + dx, y: draft.y + dy });

  return (
    <BottomSheet open={sheet.open} onClose={sheet.close} title={editing ? "Editar ambiente" : "Nuevo ambiente"}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qué es">
            <Select
              value={draft.kind}
              onChange={(e) => {
                const kind = e.target.value as RoomKind;
                set({ kind });
              }}
            >
              {ROOM_KINDS.map((k) => (
                <option key={k} value={k}>
                  {ROOM_STYLE[k].emoji} {ROOM_STYLE[k].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Piso">
            <Select value={draft.floor} onChange={(e) => set({ floor: Number(e.target.value) })}>
              {FLOORS.map((f) => (
                <option key={f} value={f}>
                  {floorLabel(f)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Nombre">
          <Input key={editing?.id ?? "new"} name="name" required maxLength={40} defaultValue={editing?.name ?? ""} placeholder={`${ROOM_STYLE[draft.kind].label}, Cuarto de Mica…`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ancho (metros)">
            <Select value={draft.w} onChange={(e) => set({ w: Number(e.target.value) })}>
              {SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} m
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Largo (metros)">
            <Select value={draft.h} onChange={(e) => set({ h: Number(e.target.value) })}>
              {SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} m
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div role="group" aria-label="Ubicación en el plano" className="flex flex-col gap-2">
          <span className="text-label font-bold uppercase tracking-wider text-ink-ghost">Dónde queda</span>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 rounded-md bg-line/40 p-2">
              <PlanCanvas rooms={preview} members={[]} presence={[]} view="plano" highlight="__draft__" compact />
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-1">
              <span />
              <Nudge label="Arriba" onClick={() => move(0, -1)} icon={<ArrowUp size={16} />} />
              <span />
              <Nudge label="Izquierda" onClick={() => move(-1, 0)} icon={<ArrowLeft size={16} />} />
              <span />
              <Nudge label="Derecha" onClick={() => move(1, 0)} icon={<ArrowRight size={16} />} />
              <span />
              <Nudge label="Abajo" onClick={() => move(0, 1)} icon={<ArrowDown size={16} />} />
              <span />
            </div>
          </div>
          <span className="text-meta text-ink-faint">Arriba es el frente (la calle o la entrada). Movelo con las flechas.</span>
        </div>
        {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
        <SubmitRow
          saving={sheet.saving}
          submitLabel={editing ? "Guardar" : "Agregar"}
          onDelete={
            editing
              ? () => {
                  if (confirm(`¿Borrar "${editing.name}" del plano?`)) sheet.run(() => deleteRoom(editing.id));
                }
              : undefined
          }
        />
      </form>
    </BottomSheet>
  );
}

function Nudge({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-md border-[1.5px] border-line text-ink-soft active:bg-line/60">
      {icon}
    </button>
  );
}

// ── Dibujarla con IA ─────────────────────────────────────────────────────────────────────────
const MAX_PHOTOS = 6;

// Achica la foto en el celu antes de mandarla (así sube rápido y no pasa el límite del servidor).
async function shrink(file: File, max = 1280): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

type Sketch = { summary: string; rooms: RoomDraft[] };

function SketchSheet({ open, onClose, hasRooms, onUsed }: { open: boolean; onClose: () => void; hasRooms: boolean; onUsed: (floor: number) => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [phase, setPhase] = useState<"input" | "loading" | "preview" | "saving">("input");
  const [sketch, setSketch] = useState<Sketch | null>(null);
  const [floor, setFloor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dictation = useDictation(text, setText);

  async function addPhotos(files: FileList) {
    setError(null);
    try {
      const room = MAX_PHOTOS - photos.length;
      const next = await Promise.all([...files].slice(0, room).map((f) => shrink(f)));
      setPhotos((p) => [...p, ...next].slice(0, MAX_PHOTOS));
    } catch {
      setError("No pude leer alguna de las fotos. Probá con otra.");
    }
  }

  async function draw() {
    dictation.stop();
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/plano", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: text, photos }) });
      const data = (await res.json()) as { ok: true; sketch: Sketch } | { ok: false; error: string };
      if (!data.ok) throw new Error(data.error);
      setSketch(data.sketch);
      setFloor(Math.min(...data.sketch.rooms.map((r) => r.floor)));
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude dibujarla. Probá de nuevo.");
      setPhase("input");
    }
  }

  async function use() {
    if (!sketch) return;
    if (hasRooms && !confirm("Esto reemplaza el plano que ya tenían (y quién estaba en cada ambiente). ¿Seguimos?")) return;
    setPhase("saving");
    try {
      await replaceRooms(sketch.rooms);
      onUsed(floor);
      router.refresh();
      onClose();
      setSketch(null);
      setPhotos([]);
      setText("");
      setPhase("input");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el plano.");
      setPhase("preview");
    }
  }

  const floors = sketch ? [...new Set(sketch.rooms.map((r) => r.floor))].sort((a, b) => a - b) : [];
  const placed: Placed[] = (sketch?.rooms ?? []).map((r, i) => ({ ...r, id: `s${i}` })).filter((r) => r.floor === floor);

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        dictation.stop();
        if (phase !== "loading" && phase !== "saving") onClose();
      }}
      title={phase === "preview" || phase === "saving" ? "¿Así es tu casa?" : "Dibujar la casa con IA"}
    >
      {phase === "loading" && <LadybugLoader label="Dibujando tu casa… (puede tardar medio minuto)" className="py-10" />}

      {phase === "input" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-label font-bold uppercase tracking-wider text-ink-ghost">Contame cómo es</span>
            <Textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: Casa de dos plantas. Abajo, living-comedor al frente, la cocina atrás que da al patio, un baño chico y el lavadero. Arriba, tres cuartos (el nuestro, el de Mica y el de Benja) y un baño en el medio."
            />
            {dictation.supported && (
              <button
                type="button"
                onClick={dictation.listening ? dictation.stop : dictation.start}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold ${dictation.listening ? "bg-coral text-white" : "border-[1.5px] border-line text-ink-soft"}`}
              >
                {dictation.listening ? <Square size={15} fill="currentColor" /> : <Mic size={16} />}
                {dictation.listening ? "Listo, terminé de hablar" : "Contarlo hablando"}
              </button>
            )}
            {dictation.error && <p className="text-sm text-danger">{dictation.error}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-label font-bold uppercase tracking-wider text-ink-ghost">Fotos de los ambientes (opcional, hasta {MAX_PHOTOS})</span>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Sacar foto"
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed border-line text-xs font-semibold text-ink-soft"
                >
                  <ImagePlus size={20} /> Sumar
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="text-meta text-ink-faint">Las fotos solo se usan para dibujar el plano; no se guardan.</span>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="button" onClick={draw} disabled={text.trim().length < 15 && !photos.length} className="lb-btn flex min-h-12 items-center justify-center gap-2 disabled:opacity-50">
            <Sparkles size={18} /> Dibujar mi casa
          </button>
        </div>
      )}

      {(phase === "preview" || phase === "saving") && sketch && (
        <div className="flex flex-col gap-4">
          {sketch.summary && <p className="font-accent text-xl text-ink-soft">{sketch.summary}</p>}
          {floors.length > 1 && (
            <div className="flex gap-2">
              {floors.map((f) => (
                <button key={f} type="button" onClick={() => setFloor(f)} className={`lb-chip min-h-8 !px-3 ${floor === f ? "bg-ink text-cream" : "bg-line/60 text-ink-soft"}`}>
                  {floorLabel(f)}
                </button>
              ))}
            </div>
          )}
          <PlanCanvas rooms={placed} members={[]} presence={[]} view="3d" />
          <p className="text-meta text-ink-faint">
            {sketch.rooms.length} ambientes. Es un boceto: después tocás cada uno para acomodarlo.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="button" onClick={use} disabled={phase === "saving"} className="lb-btn min-h-12 disabled:opacity-60">
            {phase === "saving" ? "Guardando…" : "Usar este plano"}
          </button>
          <button type="button" onClick={() => setPhase("input")} disabled={phase === "saving"} className="min-h-11 text-sm font-semibold text-ink-faint">
            Ajustar lo que conté
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
