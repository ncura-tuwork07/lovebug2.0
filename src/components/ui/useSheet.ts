"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreRows, type DeletedRows } from "@/app/actions/undo";
import { useUndo } from "@/components/ui/Undo";

export function useSheet<T>() {
  const router = useRouter();
  const offerUndo = useUndo();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNew = useCallback(() => {
    setEditing(null);
    setError(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditing(item);
    setError(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditing(null);
    setError(null);
  }, []);

  // Corre una acción del servidor, refresca los datos y cierra el sheet.
  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setSaving(true);
      setError(null);
      try {
        await fn();
        router.refresh();
        close();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos guardarlo. Probá de nuevo en un toque.");
      } finally {
        setSaving(false);
      }
    },
    [router, close]
  );

  // Borra, cierra y ofrece "Deshacer" unos segundos (en vez de preguntar "¿seguro?").
  const remove = useCallback(
    (fn: () => Promise<DeletedRows>, what: string) =>
      run(async () => {
        const deleted = await fn();
        if (deleted.rows.length) offerUndo(`Borraste ${what}`, () => restoreRows(deleted));
      }),
    [run, offerUndo]
  );

  return { open, editing, saving, error, openNew, openEdit, close, run, remove, setError };
}

export function fd(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    str: (k: string) => String(data.get(k) ?? ""),
    opt: (k: string) => {
      const v = String(data.get(k) ?? "").trim();
      return v === "" ? null : v;
    },
    bool: (k: string) => data.get(k) === "on",
    num: (k: string) => Number(data.get(k) ?? 0),
  };
}
