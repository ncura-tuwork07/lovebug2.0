// El plano de la casa: ambientes en una grilla de GRID × GRID por piso (1 cuadradito ≈ 1 metro).

export const GRID = 24;

export const ROOM_KINDS = [
  "living",
  "comedor",
  "cocina",
  "dormitorio",
  "bano",
  "lavadero",
  "patio",
  "balcon",
  "garage",
  "oficina",
  "pasillo",
  "juegos",
  "otro",
] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

export const FLOORS = [-1, 0, 1, 2, 3] as const;
export const floorLabel = (f: number) => (f === 0 ? "Planta baja" : f === -1 ? "Subsuelo" : `Piso ${f}`);

export type Room = {
  id: string;
  name: string;
  kind: RoomKind;
  floor: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RoomDraft = Omit<Room, "id">;

export type Presence = { member_id: string; room_id: string | null; updated_at: string };

// Piso de cada ambiente, como en los juegos: madera, cerámica, pasto o cemento. Colores fijos
// (son un dibujo, no parte del tema) que se leen bien en claro y en oscuro.
const WOOD = "repeating-linear-gradient(90deg, #D9A86C 0 10px, #CF9C5E 10px 11px, #DDB077 11px 21px, #C99459 21px 22px)";
const TILE = (a: string, b: string) => `repeating-conic-gradient(${a} 0 25%, ${b} 0 50%) 0 0 / 16px 16px`;
const GRASS = "radial-gradient(#6FBF5E 1.5px, transparent 1.6px) 0 0 / 9px 9px, #86CF72";
const CONCRETE = "radial-gradient(#9AA3AE 1px, transparent 1.2px) 0 0 / 7px 7px, #B9C0C8";

export const ROOM_STYLE: Record<RoomKind, { label: string; emoji: string; floor: string }> = {
  living: { label: "Living", emoji: "🛋️", floor: WOOD },
  comedor: { label: "Comedor", emoji: "🍽️", floor: WOOD },
  cocina: { label: "Cocina", emoji: "🍳", floor: TILE("#F4F1EA", "#DCD5C8") },
  dormitorio: { label: "Dormitorio", emoji: "🛏️", floor: WOOD },
  bano: { label: "Baño", emoji: "🛁", floor: TILE("#E6F2F7", "#BFDCE8") },
  lavadero: { label: "Lavadero", emoji: "🧺", floor: TILE("#EEF0F2", "#D3D8DD") },
  patio: { label: "Patio / jardín", emoji: "🌳", floor: GRASS },
  balcon: { label: "Balcón / terraza", emoji: "🪴", floor: CONCRETE },
  garage: { label: "Garage", emoji: "🚗", floor: CONCRETE },
  oficina: { label: "Oficina / estudio", emoji: "💻", floor: WOOD },
  pasillo: { label: "Pasillo / entrada", emoji: "🚪", floor: TILE("#EDE6DA", "#E2D8C6") },
  juegos: { label: "Cuarto de juegos", emoji: "🧸", floor: TILE("#FDE8EC", "#F8D1D9") },
  otro: { label: "Otro", emoji: "📦", floor: TILE("#EFEAE2", "#E3DCD0") },
};

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Deja un ambiente dentro de la grilla y con valores que la base acepta (lo usa la IA y el form).
export function cleanRoom(r: Partial<RoomDraft> & { name?: unknown; kind?: unknown }): RoomDraft | null {
  const name = String(r.name ?? "").trim().slice(0, 40);
  if (!name) return null;
  const kind = (ROOM_KINDS as readonly string[]).includes(String(r.kind)) ? (r.kind as RoomKind) : "otro";
  const w = int(r.w, 1, GRID, 4);
  const h = int(r.h, 1, GRID, 4);
  return {
    name,
    kind,
    floor: int(r.floor, -1, 3, 0),
    x: int(r.x, 0, GRID - w, 0),
    y: int(r.y, 0, GRID - h, 0),
    w,
    h,
  };
}

const overlaps = (a: Pick<Room, "x" | "y" | "w" | "h">, b: Pick<Room, "x" | "y" | "w" | "h">) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Primer lugar libre del piso donde entra un ambiente de w × h (de arriba a abajo, de izquierda a
// derecha). Si no entra en ningún lado, lo deja abajo de todo.
export function freeSpot(rooms: Pick<Room, "x" | "y" | "w" | "h">[], w: number, h: number): { x: number; y: number } {
  for (let y = 0; y + h <= GRID; y++) {
    for (let x = 0; x + w <= GRID; x++) {
      if (!rooms.some((r) => overlaps(r, { x, y, w, h }))) return { x, y };
    }
  }
  return { x: 0, y: Math.max(0, GRID - h) };
}

// Lo deja dentro de la grilla y sin ambientes encimados (si vienen encimados, lo corre al primer
// lugar libre de su piso). Lo usan la IA y el "usar este plano".
export function placeRooms(raw: Partial<RoomDraft>[], limit = 40): RoomDraft[] {
  const out: RoomDraft[] = [];
  for (const r of raw.slice(0, limit)) {
    const room = cleanRoom(r);
    if (!room) continue;
    const same = out.filter((o) => o.floor === room.floor);
    out.push(same.some((o) => overlaps(o, room)) ? { ...room, ...freeSpot(same, room.w, room.h) } : room);
  }
  return out;
}

// Lo que ocupa lo dibujado en un piso (para no mostrar una grilla vacía de 24 × 24).
export const usedRows = (rooms: Pick<Room, "y" | "h">[]) => Math.max(6, ...rooms.map((r) => r.y + r.h));
export const usedCols = (rooms: Pick<Room, "x" | "w">[]) => Math.max(6, ...rooms.map((r) => r.x + r.w));

// Cuánto hace que marcó dónde estaba: pasadas unas horas lo mostramos apagado.
export const PRESENCE_FRESH_MS = 4 * 3600_000;

// ── "¿Dónde estás?" y "Vení para acá" (migración 015) ─────────────────────────────────────────
export type PingKind = "donde" | "veni";
export type PingReply = "aca" | "afuera" | "voy" | "ratito" | "no";
export type HomePing = {
  id: string;
  from_member: string;
  to_member: string;
  kind: PingKind;
  room_id: string | null;
  reply: PingReply | null;
  reply_room_id: string | null;
  answered_at: string | null;
  created_at: string;
};
export const PING_REPLIES: Record<PingKind, PingReply[]> = { donde: ["aca", "afuera"], veni: ["voy", "ratito", "no"] };
export const PING_PENDING_MS = 2 * 3600_000; // pasado esto, una pregunta sin contestar ya no aparece

// Cada cambio de ambiente, para las pisadas del Mapa del Merodeador (null = afuera de la casa).
export type HomeMove = { member_id: string; from_room: string | null; to_room: string | null; moved_at: string };
export const MOVES_KEEP_MS = 2 * 86_400_000;

const roomLabel = (room: Pick<Room, "name" | "kind"> | null | undefined) => (room ? `${ROOM_STYLE[room.kind].emoji} ${room.name}` : null);

// Lo que contestó, contado para quien preguntó (el aviso y el cartelito de la app).
export function pingAnswerText(ping: Pick<HomePing, "kind" | "reply" | "room_id" | "reply_room_id">, name: string, rooms: Pick<Room, "id" | "name" | "kind">[]): string {
  const room = (id: string | null) => roomLabel(rooms.find((r) => r.id === id));
  switch (ping.reply) {
    case "aca":
      return `${name} está en ${room(ping.reply_room_id) ?? "casa"}`;
    case "afuera":
      return `${name} no está en casa`;
    case "voy":
      return `${name}: ¡Voy! 🏃${room(ping.room_id) ? ` (a ${room(ping.room_id)})` : ""}`;
    case "ratito":
      return `${name}: En un ratito ⏳`;
    case "no":
      return `${name}: Ahora no puedo 🙅`;
    default:
      return ping.kind === "donde" ? `Esperando que ${name} conteste…` : `Esperando que ${name} venga…`;
  }
}

// Lo que le llega a quien le preguntan.
export function pingAskText(ping: Pick<HomePing, "kind" | "room_id">, from: string, rooms: Pick<Room, "id" | "name" | "kind">[]): { title: string; body: string } {
  if (ping.kind === "donde") return { title: `📍 ${from} pregunta dónde estás`, body: "Tocá para contarle en qué parte de la casa estás." };
  const room = roomLabel(rooms.find((r) => r.id === ping.room_id));
  return { title: `🙋 ${from} te llama`, body: room ? `Vení a ${room}.` : "Vení un toque." };
}
