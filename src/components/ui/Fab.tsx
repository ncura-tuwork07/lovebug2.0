"use client";

import { Plus } from "lucide-react";

export function Fab({ onClick, label = "Agregar" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-coral text-white shadow-fab transition-transform active:scale-95"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
