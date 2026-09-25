"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayAR } from "@/lib/format";

function revalidate(eventId: string) {
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/finanzas");
  revalidatePath("/");
}

// Reparte un monto entre N personas, con el resto (por el redondeo) para la primera: así la
// suma de las partes da exacto el total, sin decimales sueltos por ahí.
function splitEqually(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor((total / n) * 100) / 100;
  const parts = new Array(n).fill(base);
  const rest = Math.round((total - base * n) * 100) / 100;
  parts[0] = Math.round((parts[0] + rest) * 100) / 100;
  return parts;
}

export type SplitGuestInput = { guest_id: string; amount?: number | string };

export type SaveSplitInput = {
  event_id: string;
  method: "equal" | "manual";
  payer_member_id: string | null;
  payment_info: string | null;
  total: number | string; // para "partes iguales": el monto a repartir
  guests: SplitGuestInput[]; // en manual, cada uno trae su "amount"
};

// Crea o reemplaza la división de un evento (borra las partes viejas y arma las nuevas).
export async function saveEventSplit(input: SaveSplitInput): Promise<void> {
  const supabase = await createClient();
  if (!input.guests.length) throw new Error("Elegí a quiénes les toca pagar.");

  const { data: existing } = await supabase.from("event_splits").select("id, share_token").eq("event_id", input.event_id).maybeSingle();

  const row = {
    event_id: input.event_id,
    method: input.method,
    payer_member_id: input.payer_member_id || null,
    payment_info: input.payment_info?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  let splitId: string;
  if (existing) {
    splitId = existing.id;
    const { error } = await supabase.from("event_splits").update(row).eq("id", splitId);
    if (error) throw new Error(error.message);
    // Si ya había alguna parte pagada con un reintegro cargado, lo borramos antes de rearmar.
    const { data: old } = await supabase.from("event_split_shares").select("income_id").eq("event_split_id", splitId).not("income_id", "is", null);
    const oldIncomeIds = (old ?? []).map((o) => o.income_id).filter((v): v is string => !!v);
    if (oldIncomeIds.length) await supabase.from("incomes").delete().in("id", oldIncomeIds);
    await supabase.from("event_split_shares").delete().eq("event_split_id", splitId);
  } else {
    const { data, error } = await supabase.from("event_splits").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    splitId = data.id;
  }

  const amounts =
    input.method === "equal"
      ? splitEqually(Number(input.total) || 0, input.guests.length)
      : input.guests.map((g) => Number(String(g.amount ?? 0).replace(",", ".")) || 0);

  const shares = input.guests.map((g, i) => ({ event_split_id: splitId, guest_id: g.guest_id, amount: amounts[i] }));
  const { error: sharesError } = await supabase.from("event_split_shares").insert(shares);
  if (sharesError) throw new Error(sharesError.message);

  revalidate(input.event_id);
}

export async function deleteEventSplit(eventId: string, splitId: string): Promise<void> {
  const supabase = await createClient();
  const { data: old } = await supabase.from("event_split_shares").select("income_id").eq("event_split_id", splitId).not("income_id", "is", null);
  const oldIncomeIds = (old ?? []).map((o) => o.income_id).filter((v): v is string => !!v);
  if (oldIncomeIds.length) await supabase.from("incomes").delete().in("id", oldIncomeIds);
  const { error } = await supabase.from("event_splits").delete().eq("id", splitId);
  if (error) throw new Error(error.message);
  revalidate(eventId);
}

// Marca una parte como pagada: le crea al que cobra un reintegro en Finanzas. Sirve igual si
// pagaron por transferencia, en efectivo o "por fuera" — vos elegís la nota.
export async function markShareStatus(input: {
  eventId: string;
  shareId: string;
  status: "pendiente" | "pagado";
  paidNote?: string | null;
}): Promise<void> {
  const supabase = await createClient();

  if (input.status === "pendiente") {
    const { data: share } = await supabase.from("event_split_shares").select("income_id").eq("id", input.shareId).maybeSingle();
    if (share?.income_id) await supabase.from("incomes").delete().eq("id", share.income_id);
    const { error } = await supabase.from("event_split_shares").update({ status: "pendiente", paid_note: null, income_id: null }).eq("id", input.shareId);
    if (error) throw new Error(error.message);
    revalidate(input.eventId);
    return;
  }

  const { data: share, error: shareError } = await supabase
    .from("event_split_shares")
    .select("amount, guest_id, event_split_id, event_guests(name), event_splits(payer_member_id, event_id, family_events(title))")
    .eq("id", input.shareId)
    .single();
  if (shareError) throw new Error(shareError.message);

  // Tipa lo que necesitamos del join anidado sin pelear con los tipos generados de Supabase.
  const guestName = (share.event_guests as unknown as { name: string } | null)?.name ?? "alguien";
  const splitInfo = share.event_splits as unknown as { payer_member_id: string | null; event_id: string; family_events: { title: string } | null } | null;
  const eventTitle = splitInfo?.family_events?.title ?? "el evento";

  let incomeId: string | null = null;
  if (splitInfo?.payer_member_id && Number(share.amount) > 0) {
    const { data: income, error: incomeError } = await supabase
      .from("incomes")
      .insert({
        description: `${guestName} te devolvió su parte de ${eventTitle}`,
        amount: Number(share.amount),
        source: "reintegro",
        member_id: splitInfo.payer_member_id,
        received_at: todayAR(),
        is_recurring: false,
      })
      .select("id")
      .single();
    if (incomeError) throw new Error(incomeError.message);
    incomeId = income.id;
  }

  const { error } = await supabase
    .from("event_split_shares")
    .update({ status: "pagado", paid_note: input.paidNote?.trim() || null, income_id: incomeId })
    .eq("id", input.shareId);
  if (error) throw new Error(error.message);
  revalidate(input.eventId);
}
