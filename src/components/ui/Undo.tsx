"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";

type Offer = { id: number; label: string; undo: () => Promise<void> };
const UndoContext = createContext<(label: string, undo: () => Promise<void>) => void>(() => {});
const SECONDS = 6;

// "Deshacer" después de borrar: en vez de preguntar "¿seguro?", se borra enseguida y durante unos
// segundos aparece abajo un aviso para volver atrás.
export function UndoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  const show = useCallback((label: string, undo: () => Promise<void>) => {
    setFailed(false);
    setOffer({ id: ++seq.current, label, undo });
  }, []);

  useEffect(() => {
    if (!offer || busy) return;
    const t = setTimeout(() => setOffer((o) => (o?.id === offer.id ? null : o)), SECONDS * 1000);
    return () => clearTimeout(t);
  }, [offer, busy]);

  async function undo() {
    if (!offer) return;
    setBusy(true);
    try {
      await offer.undo();
      setOffer(null);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <UndoContext.Provider value={show}>
      {children}
      {offer && (
        <div
          key={offer.id}
          role="status"
          className="lb-fade-in fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 mx-auto flex w-[calc(100%-32px)] max-w-md items-center gap-3 overflow-hidden rounded-card bg-[#1E293B] py-2 pl-4 pr-2 text-sm text-white shadow-pop"
        >
          <span className="min-w-0 flex-1 truncate">{failed ? "No se pudo deshacer." : offer.label}</span>
          {!failed && (
            <button type="button" onClick={undo} disabled={busy} className="flex min-h-10 items-center gap-1.5 rounded-md px-3 font-semibold text-[#FF8A8E] disabled:opacity-60">
              <Undo2 size={16} /> {busy ? "Volviendo…" : "Deshacer"}
            </button>
          )}
          {!busy && <span className="absolute bottom-0 left-0 h-0.5 bg-[#FF8A8E]" style={{ animation: `lb-undo ${SECONDS}s linear forwards` }} />}
        </div>
      )}
    </UndoContext.Provider>
  );
}

export const useUndo = () => useContext(UndoContext);
