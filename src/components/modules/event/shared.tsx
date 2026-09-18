"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Estado compartido de "estoy guardando" + mensaje, para las secciones del evento.
export function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key);
    setMsg(null);
    try {
      const r = await fn();
      if (done) setMsg(typeof r === "number" ? done.replace("{n}", String(r)) : done);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Algo falló.");
    } finally {
      setBusy(null);
    }
  }
  return { busy, msg, run, setMsg };
}

export function SectionTitle({ icon, color, children, action }: { icon: ReactNode; color: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide" style={{ color }}>
        {icon} {children}
      </h2>
      {action}
    </div>
  );
}

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-line/60 px-3 text-xs font-semibold text-ink">
      <Plus size={14} /> {label}
    </button>
  );
}

// Sube un archivo del evento al bucket privado, dentro de la carpeta del hogar.
export async function uploadEventFile(householdId: string, eventId: string, prefix: string, file: File): Promise<string> {
  if (file.size > 15 * 1024 * 1024) throw new Error("El archivo es muy pesado (máximo 15 MB).");
  const supabase = createClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-60);
  const path = `${householdId}/eventos/${eventId}/${prefix}-${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}
