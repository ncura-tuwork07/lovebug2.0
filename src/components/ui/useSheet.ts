"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export function useSheet<T>() {
  const router = useRouter();
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

  return { open, editing, saving, error, openNew, openEdit, close, run, setError };
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
