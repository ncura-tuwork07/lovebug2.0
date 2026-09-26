"use client";

import { Plus } from "lucide-react";

// Botón concreto para una lista vacía ("Cargar el primer gasto"): más claro que "tocá +".
export function EmptyAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 flex min-h-11 w-fit items-center gap-2 rounded-full border-[1.5px] border-coral/40 bg-coral-soft px-4 text-sm font-semibold text-coral"
    >
      <Plus size={16} /> {label}
    </button>
  );
}
