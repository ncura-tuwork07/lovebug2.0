"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Gift, Star, Trophy } from "lucide-react";
import type { Member, PointsEntry, Reward } from "@/lib/types";
import { adjustPoints, deleteReward, redeemReward, saveReward } from "@/app/actions/points";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, SubmitRow } from "@/components/ui/Field";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatDay } from "@/lib/format";

export function PointsView({
  members,
  ledger,
  rewards,
}: {
  members: Member[];
  ledger: PointsEntry[];
  rewards: Reward[];
}) {
  const router = useRouter();
  const rewardSheet = useSheet<Reward>();
  const adjustSheet = useSheet<Member>();
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const kids = members.filter((m) => m.is_child);
  const balance = (id: string) => ledger.filter((l) => l.member_id === id).reduce((s, l) => s + l.points, 0);
  const ranking = [...kids].sort((a, b) => balance(b.id) - balance(a.id));

  function submitReward(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    rewardSheet.run(() =>
      saveReward({ id: rewardSheet.editing?.id, title: f.str("title"), cost: f.str("cost"), emoji: f.opt("emoji") })
    );
  }

  function submitAdjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    if (!adjustSheet.editing) return;
    adjustSheet.run(() => adjustPoints(adjustSheet.editing!.id, f.str("points"), f.str("reason")));
  }

  async function redeem(memberId: string, rewardId: string) {
    setRedeeming(`${memberId}:${rewardId}`);
    setRedeemError(null);
    try {
      await redeemReward(memberId, rewardId);
      router.refresh();
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : "No se pudo canjear.");
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {kids.length === 0 ? (
        <p className="font-accent text-2xl text-ink-faint">
          Primero agregá a los chicos en Familia. Después, cada tarea con estrellas suma puntos.
        </p>
      ) : (
        <section className="lb-card">
          <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-success">
            <Trophy size={16} /> Ranking
          </h2>
          <ul className="flex flex-col gap-3">
            {ranking.map((kid, i) => (
              <li key={kid.id} className="flex items-center gap-3">
                <span className="w-5 text-center font-display text-lg font-bold text-ink-ghost">{i + 1}</span>
                <MemberAvatar member={kid} size={36} />
                <button type="button" onClick={() => adjustSheet.openEdit(kid)} className="min-h-11 flex-1 text-left">
                  <p className="text-item font-medium text-ink">{kid.name}</p>
                  <p className="text-meta text-ink-faint">Tocá para sumar o restar puntos</p>
                </button>
                <span className="flex items-center gap-1 font-display text-lg font-bold text-amber">
                  <Star size={16} fill="currentColor" /> {balance(kid.id)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-coral">
          <Gift size={16} /> Premios
        </h2>
        {rewards.length === 0 && (
          <p className="text-body text-ink-faint">Tocá + para cargar premios: “elegir la peli”, “helado”, “media hora más de pantalla”…</p>
        )}
        <ul className="flex flex-col gap-3">
          {rewards.map((r) => (
            <li key={r.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => rewardSheet.openEdit(r)} className="min-h-9 flex-1 text-left text-item text-ink">
                  {r.emoji ? `${r.emoji} ` : ""}
                  {r.title}
                </button>
                <span className="text-sm font-semibold text-amber">★ {r.cost}</span>
              </div>
              {kids.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {kids.map((kid) => (
                    <button
                      key={kid.id}
                      type="button"
                      disabled={redeeming !== null || balance(kid.id) < r.cost}
                      onClick={() => redeem(kid.id, r.id)}
                      className="lb-chip min-h-8 border-[1.5px] disabled:opacity-40"
                      style={{ borderColor: kid.color, color: kid.color }}
                    >
                      Canjear {kid.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        {redeemError && <p className="mt-2 text-sm text-danger">{redeemError}</p>}
      </section>

      {ledger.length > 0 && (
        <section className="lb-card">
          <h2 className="text-label mb-2 font-display uppercase tracking-wider text-ink-ghost">Últimos movimientos</h2>
          <ul className="flex flex-col gap-1.5">
            {ledger.slice(0, 15).map((l) => {
              const m = members.find((x) => x.id === l.member_id);
              return (
                <li key={l.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m?.color }} />
                  <span className="flex-1 text-ink-soft">
                    {m?.name}: {l.reason}
                  </span>
                  <span className={`font-semibold ${l.points > 0 ? "text-success" : "text-coral"}`}>
                    {l.points > 0 ? "+" : ""}
                    {l.points}
                  </span>
                  <span className="text-meta text-ink-ghost">{formatDay(l.created_at.slice(0, 10), "d MMM")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Fab onClick={rewardSheet.openNew} label="Nuevo premio" />

      <BottomSheet open={rewardSheet.open} onClose={rewardSheet.close} title={rewardSheet.editing ? "Editar premio" : "Nuevo premio"}>
        <form onSubmit={submitReward} className="flex flex-col gap-4">
          <Field label="Premio">
            <Input name="title" required autoFocus defaultValue={rewardSheet.editing?.title ?? ""} placeholder="Elegir la peli del viernes" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cuesta (puntos)">
              <Input name="cost" type="number" inputMode="numeric" min="1" required defaultValue={rewardSheet.editing?.cost ?? 50} />
            </Field>
            <Field label="Emoji (opcional)">
              <Input name="emoji" defaultValue={rewardSheet.editing?.emoji ?? ""} placeholder="🍦" maxLength={4} />
            </Field>
          </div>
          {rewardSheet.error && <p className="text-sm text-danger">{rewardSheet.error}</p>}
          <SubmitRow saving={rewardSheet.saving} onDelete={rewardSheet.editing ? () => rewardSheet.remove(() => deleteReward(rewardSheet.editing!.id), `el premio “${rewardSheet.editing!.title}”`) : undefined} />
        </form>
      </BottomSheet>

      <BottomSheet open={adjustSheet.open} onClose={adjustSheet.close} title={`Puntos de ${adjustSheet.editing?.name ?? ""}`}>
        <form onSubmit={submitAdjust} className="flex flex-col gap-4">
          <Field label="Puntos" hint="Usá negativo para restar (ej: -10).">
            <Input name="points" type="number" inputMode="numeric" required autoFocus placeholder="10" />
          </Field>
          <Field label="Motivo">
            <Input name="reason" placeholder="Ayudó a poner la mesa" />
          </Field>
          {adjustSheet.error && <p className="text-sm text-danger">{adjustSheet.error}</p>}
          <SubmitRow saving={adjustSheet.saving} submitLabel="Aplicar" />
        </form>
      </BottomSheet>
    </div>
  );
}
