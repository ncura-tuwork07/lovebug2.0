"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-sheet bg-cream shadow-pop">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <span className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="font-display text-h1 font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-faint hover:bg-line/60"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
