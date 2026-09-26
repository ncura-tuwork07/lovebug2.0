"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeletedRows } from "@/app/actions/undo";

function revalidate() {
  revalidatePath("/puntos");
  revalidatePath("/familia");
  revalidatePath("/");
}

export type RewardInput = { id?: string; title: string; cost: number | string; emoji: string | null };

export async function saveReward(input: RewardInput) {
  const supabase = await createClient();
  const cost = Math.round(Number(input.cost));
  const row = { title: input.title.trim(), cost, emoji: input.emoji?.trim() || null, active: true };
  if (!row.title) throw new Error("Falta el nombre del premio.");
  if (!Number.isFinite(cost) || cost <= 0) throw new Error("Los puntos tienen que ser más de cero.");
  const { error } = input.id
    ? await supabase.from("rewards").update(row).eq("id", input.id)
    : await supabase.from("rewards").insert(row);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteReward(id: string): Promise<DeletedRows> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rewards").delete().eq("id", id).select();
  if (error) throw new Error(error.message);
  revalidate();
  return { table: "rewards", rows: data ?? [] };
}

export async function redeemReward(memberId: string, rewardId: string) {
  const supabase = await createClient();
  const [{ data: reward }, { data: ledger }] = await Promise.all([
    supabase.from("rewards").select("title, cost, emoji").eq("id", rewardId).single(),
    supabase.from("points_ledger").select("points").eq("member_id", memberId),
  ]);
  if (!reward) throw new Error("No encontramos el premio.");
  const balance = (ledger ?? []).reduce((s, r) => s + r.points, 0);
  if (balance < reward.cost) throw new Error(`Faltan ${reward.cost - balance} puntos para este premio.`);

  const { error } = await supabase.from("points_ledger").insert({
    member_id: memberId,
    points: -reward.cost,
    reason: `Canje: ${reward.emoji ? reward.emoji + " " : ""}${reward.title}`,
    ref_id: rewardId,
  });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function adjustPoints(memberId: string, points: number | string, reason: string) {
  const supabase = await createClient();
  const p = Math.round(Number(points));
  if (!Number.isFinite(p) || p === 0) throw new Error("Ingresá una cantidad de puntos.");
  const { error } = await supabase
    .from("points_ledger")
    .insert({ member_id: memberId, points: p, reason: reason.trim() || (p > 0 ? "Puntos extra" : "Ajuste") });
  if (error) throw new Error(error.message);
  revalidate();
}
