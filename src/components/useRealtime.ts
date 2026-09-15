"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Handler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

// Se suscribe a cambios de una tabla (Supabase Realtime). Con RLS, hay que pasarle el
// token del usuario al socket antes de suscribir, si no los eventos llegan filtrados.
export function useRealtimeTable(table: string, onChange: Handler) {
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (disposed) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, onChange)
        .subscribe();
    })();

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}

// Variante simple: ante cualquier cambio, refresca los datos del servidor.
export function useRealtimeRefresh(table: string) {
  const router = useRouter();
  useRealtimeTable(table, () => router.refresh());
}
