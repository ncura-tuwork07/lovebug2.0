"use client";

import { floorLabel, ROOM_STYLE, type Room } from "@/lib/home";

// Los ambientes para tocar "estoy acá", agrupados por piso. Lo usan el plano y la respuesta a "¿Dónde estás?".
export function RoomGrid({ rooms, current, disabled, onPick }: { rooms: Room[]; current?: string | null; disabled?: boolean; onPick: (room: Room) => void }) {
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  return (
    <div className="flex flex-col gap-2">
      {floors.map((f) => (
        <div key={f} className="flex flex-col gap-2">
          {floors.length > 1 && <p className="text-label font-bold uppercase tracking-wider text-ink-ghost">{floorLabel(f)}</p>}
          <div className="grid grid-cols-2 gap-2">
            {rooms
              .filter((r) => r.floor === f)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(r)}
                  className={`flex min-h-11 items-center gap-2 rounded-md border-[1.5px] px-3 text-left text-sm font-semibold disabled:opacity-60 ${
                    current === r.id ? "border-coral bg-coral-soft text-ink" : "border-line text-ink-soft"
                  }`}
                >
                  <span>{ROOM_STYLE[r.kind].emoji}</span> <span className="min-w-0 truncate">{r.name}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
