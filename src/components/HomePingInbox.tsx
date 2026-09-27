"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { answerHomePing } from "@/app/actions/home";
import { useHousehold } from "@/components/HouseholdProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { RoomGrid } from "@/components/modules/RoomGrid";
import { useRealtimeTable } from "@/components/useRealtime";
import { pingAnswerText, pingAskText, type HomePing, type PingReply, type Room } from "@/lib/home";

type Inbox = { pending: HomePing[]; answered: HomePing[]; rooms: Room[]; ready?: false };

const SEEN_KEY = "lb-ping-seen"; // respuestas que ya le mostramos a quien preguntó
const LATER_KEY = "lb-ping-later"; // preguntas que dejó para después (hasta que cierre la app)

function readSet(storage: Storage | undefined, key: string): Set<string> {
  try {
    return new Set(JSON.parse(storage?.getItem(key) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function saveSet(storage: Storage | undefined, key: string, set: Set<string>) {
  try {
    storage?.setItem(key, JSON.stringify([...set].slice(-50)));
  } catch {}
}

// En toda la app: si alguien de la casa me pregunta "¿Dónde estás?" o me llama ("Vení para acá"),
// aparece para contestar con un toque. Y cuando me contestan a mí, un cartelito arriba.
export function HomePingInbox() {
  const router = useRouter();
  const { members } = useHousehold();
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [later, setLater] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<HomePing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = useRef(false);
  const off = useRef(false); // sin la migración 015 no hay nada que buscar: dejamos de preguntar

  const load = useCallback(async () => {
    if (off.current || loading.current || document.visibilityState !== "visible") return;
    loading.current = true;
    try {
      const res = await fetch("/api/casa/avisos", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Inbox;
      if (data.ready === false) off.current = true;
      setInbox(data);
    } catch {
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    setLater(readSet(typeof sessionStorage === "undefined" ? undefined : sessionStorage, LATER_KEY));
    load();
    const t = setInterval(load, 45_000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);
  useRealtimeTable("home_pings", () => load());

  // Una respuesta nueva a algo que pregunté: cartelito (una sola vez por respuesta).
  useEffect(() => {
    if (!inbox?.answered.length) return;
    const seen = readSet(localStorage, SEEN_KEY);
    const fresh = inbox.answered.find((p) => !seen.has(`${p.id}:${p.answered_at}`));
    if (!fresh) return;
    seen.add(`${fresh.id}:${fresh.answered_at}`);
    saveSet(localStorage, SEEN_KEY, seen);
    setToast(fresh);
    router.refresh(); // si está mirando el plano, que se mueva
  }, [inbox, router]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  const ping = inbox?.pending.find((p) => !later.has(p.id)) ?? null;
  const from = members.find((m) => m.id === ping?.from_member);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "Alguien";
  const rooms = inbox?.rooms ?? [];

  async function answer(reply: PingReply, roomId: string | null = null) {
    if (!ping) return;
    setBusy(true);
    setError(null);
    const res = await answerHomePing(ping.id, reply, roomId).catch(() => ({ ok: false as const, error: "No se pudo mandar. Probá de nuevo." }));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setInbox((i) => (i ? { ...i, pending: i.pending.filter((p) => !(p.from_member === ping.from_member && p.kind === ping.kind)) } : i));
    router.refresh();
  }

  function answerLater() {
    if (!ping) return;
    const next = new Set(later).add(ping.id);
    setLater(next);
    saveSet(sessionStorage, LATER_KEY, next);
    setError(null);
  }

  const ask = ping ? pingAskText(ping, from?.name ?? "Alguien", rooms) : null;

  return (
    <>
      {toast && (
        <div
          role="status"
          className="lb-fade-in fixed inset-x-0 top-[calc(12px+env(safe-area-inset-top))] z-50 mx-auto flex w-[calc(100%-32px)] max-w-md items-center gap-3 rounded-card bg-[#1E293B] py-2 pl-3 pr-1 text-sm text-white shadow-pop"
        >
          {members.find((m) => m.id === toast.to_member) && <MemberAvatar member={members.find((m) => m.id === toast.to_member)!} size={28} />}
          <Link href="/casa" onClick={() => setToast(null)} className="min-w-0 flex-1 py-1 font-semibold">
            {pingAnswerText(toast, name(toast.to_member), rooms)}
          </Link>
          <button type="button" aria-label="Cerrar" onClick={() => setToast(null)} className="flex h-10 w-10 shrink-0 items-center justify-center text-white/70">
            <X size={16} />
          </button>
        </div>
      )}

      <BottomSheet open={Boolean(ping)} onClose={answerLater} title={ask?.title ?? ""}>
        {ping && (
          <div className="flex flex-col gap-3">
            {ping.kind === "donde" ? (
              <>
                <p className="text-body text-ink-soft">Tocá dónde estás ahora y le avisamos.</p>
                <RoomGrid rooms={rooms} disabled={busy} onPick={(r) => answer("aca", r.id)} />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => answer("afuera")}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft disabled:opacity-60"
                >
                  <LogOut size={15} /> No estoy en casa
                </button>
              </>
            ) : (
              <>
                <p className="font-display text-h2 font-bold text-ink">{ask?.body}</p>
                <button type="button" disabled={busy} onClick={() => answer("voy")} className="lb-btn min-h-12 disabled:opacity-60">
                  ¡Voy! 🏃
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy} onClick={() => answer("ratito")} className="min-h-11 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft disabled:opacity-60">
                    En un ratito ⏳
                  </button>
                  <button type="button" disabled={busy} onClick={() => answer("no")} className="min-h-11 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft disabled:opacity-60">
                    Ahora no puedo
                  </button>
                </div>
              </>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="button" onClick={answerLater} className="min-h-10 text-sm font-semibold text-ink-faint">
              Después
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
