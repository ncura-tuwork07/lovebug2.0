"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import { broadcastPush } from "@/lib/push";
import { cleanRoom, MOVES_KEEP_MS, PING_REPLIES, pingAnswerText, pingAskText, placeRooms, type HomePing, type PingKind, type PingReply, type Room, type RoomDraft } from "@/lib/home";

export type RoomInput = RoomDraft & { id?: string };

export async function saveRoom(input: RoomInput): Promise<void> {
  const room = cleanRoom(input);
  if (!room) throw new Error("Ponele un nombre al ambiente.");
  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from("home_rooms").update(room).eq("id", input.id)
    : await supabase.from("home_rooms").insert(room);
  if (error) throw new Error(error.message);
  revalidatePath("/casa");
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("home_rooms").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/casa");
}

// Reemplaza el plano entero (lo que armó la IA y la persona aprobó). Los que estaban marcados en
// un ambiente quedan "sin marcar" (la base pone room_id en null al borrarlo).
export async function replaceRooms(rawRooms: RoomDraft[]): Promise<void> {
  const rooms = placeRooms(rawRooms);
  if (!rooms.length) throw new Error("El plano vino vacío.");

  const supabase = await createClient();
  const { error: delErr } = await supabase.from("home_rooms").delete().not("id", "is", null); // RLS: solo las del hogar
  if (delErr) throw new Error(delErr.message);
  const { error } = await supabase.from("home_rooms").insert(rooms);
  if (error) throw new Error(error.message);
  revalidatePath("/casa");
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Marca dónde está alguien y anota el cambio para las pisadas del Mapa del Merodeador (si la
// migración 015 todavía no se corrió, las pisadas no se guardan y listo).
async function movePresence(supabase: Supabase, memberId: string, roomId: string | null): Promise<void> {
  const { data: prev } = await supabase.from("home_presence").select("room_id").eq("member_id", memberId).maybeSingle();
  const { error } = await supabase
    .from("home_presence")
    .upsert({ member_id: memberId, room_id: roomId, updated_at: new Date().toISOString() }, { onConflict: "member_id" });
  if (error) throw new Error(error.message);
  const from = (prev?.room_id as string | null | undefined) ?? null;
  if (from === roomId) return;
  await supabase.from("home_moves").insert({ member_id: memberId, from_room: from, to_room: roomId });
  await supabase.from("home_moves").delete().lt("moved_at", new Date(Date.now() - MOVES_KEEP_MS).toISOString());
}

// "Estoy en la cocina": lo marca cada uno, o alguien por los chicos. roomId null = salió de casa.
export async function setPresence(memberId: string, roomId: string | null): Promise<void> {
  const { members } = await getSessionContext();
  if (!members.some((m) => m.id === memberId)) throw new Error("Esa persona no es de tu hogar.");
  await movePresence(await createClient(), memberId, roomId);
  revalidatePath("/casa");
}

// ── "¿Dónde estás?" y "Vení para acá" ──────────────────────────────────────────────────────────
// Devuelven el error en vez de tirarlo: en producción los errores de las acciones no llegan a la pantalla.
export type PingResult = { ok: true; pushed: boolean } | { ok: false; error: string };

const MISSING_TABLE = "Falta un paso en Supabase para usar esto (la migración 015). Avisale a quien administra Lovebug.";

async function roomsOf(supabase: Supabase): Promise<Room[]> {
  const { data } = await supabase.from("home_rooms").select("id, name, kind, floor, x, y, w, h");
  return (data ?? []) as Room[];
}

export async function sendHomePing(toId: string, kind: PingKind): Promise<PingResult> {
  const { user, me, members } = await getSessionContext();
  if (!user || !me) return { ok: false, error: "Tenés que estar logueado." };
  const to = members.find((m) => m.id === toId);
  if (!to || to.id === me.id || !["donde", "veni"].includes(kind)) return { ok: false, error: "No encontramos a esa persona." };
  if (!to.user_id) return { ok: false, error: `${to.name} no tiene Lovebug en su celu: marcá vos dónde está.` };

  const supabase = await createClient();
  // Si ya le preguntó lo mismo hace menos de un minuto, no lo volvemos a llamar.
  const { data: recent, error: readErr } = await supabase
    .from("home_pings")
    .select("id")
    .eq("from_member", me.id)
    .eq("to_member", to.id)
    .eq("kind", kind)
    .is("answered_at", null)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString())
    .limit(1);
  if (readErr) return { ok: false, error: MISSING_TABLE };
  if (recent?.length) return { ok: true, pushed: true };

  // "Vení para acá" = adonde está marcado quien llama (si no marcó nada, "vení un toque").
  const { data: mine } = kind === "veni" ? await supabase.from("home_presence").select("room_id").eq("member_id", me.id).maybeSingle() : { data: null };
  const roomId = (mine?.room_id as string | null | undefined) ?? null;
  const { data: ping, error } = await supabase.from("home_pings").insert({ from_member: me.id, to_member: to.id, kind, room_id: roomId }).select("id").single();
  if (error || !ping) return { ok: false, error: ["42P01", "PGRST205"].includes(error?.code ?? "") ? MISSING_TABLE : "No se pudo mandar. Probá de nuevo." };

  const text = pingAskText({ kind, room_id: roomId }, me.name, roomId ? await roomsOf(supabase) : []);
  const sent = await broadcastPush({ ...text, url: "/casa", tag: `ping-${ping.id}` }, { userId: to.user_id }).catch(() => 0);
  revalidatePath("/casa");
  return { ok: true, pushed: sent > 0 };
}

// Contesta quien recibió la pregunta: dónde está (y queda marcado ahí), o si viene.
export async function answerHomePing(pingId: string, reply: PingReply, roomId: string | null = null): Promise<PingResult> {
  const { me, members } = await getSessionContext();
  if (!me) return { ok: false, error: "Tenés que estar logueado." };
  const supabase = await createClient();
  const { data } = await supabase.from("home_pings").select("*").eq("id", pingId).maybeSingle();
  const ping = data as HomePing | null;
  if (!ping || ping.to_member !== me.id) return { ok: false, error: "Esa pregunta ya no está." };
  if (!PING_REPLIES[ping.kind].includes(reply)) return { ok: false, error: "Respuesta inválida." };

  const rooms = await roomsOf(supabase);
  if (reply === "aca" && !rooms.some((r) => r.id === roomId)) return { ok: false, error: "Elegí en qué parte de la casa estás." };
  try {
    if (reply === "aca") await movePresence(supabase, me.id, roomId);
    if (reply === "afuera") await movePresence(supabase, me.id, null);
    if (reply === "voy" && ping.room_id) await movePresence(supabase, me.id, ping.room_id);
  } catch {
    return { ok: false, error: "No se pudo guardar. Probá de nuevo." };
  }

  const answer = { reply, reply_room_id: reply === "aca" ? roomId : null, answered_at: new Date().toISOString() };
  // Contesta también las preguntas iguales que quedaron sin responder (si le preguntó dos veces).
  const { error } = await supabase
    .from("home_pings")
    .update(answer)
    .eq("to_member", me.id)
    .eq("from_member", ping.from_member)
    .eq("kind", ping.kind)
    .is("answered_at", null);
  if (error) return { ok: false, error: "No se pudo mandar la respuesta. Probá de nuevo." };

  const asker = members.find((m) => m.id === ping.from_member);
  let pushed = false;
  if (asker?.user_id) {
    const title = pingAnswerText({ ...ping, ...answer }, me.name, rooms);
    pushed = (await broadcastPush({ title, body: "Tocá para verlo en el plano de la casa.", url: "/casa", tag: `ping-${ping.id}` }, { userId: asker.user_id }).catch(() => 0)) > 0;
  }
  revalidatePath("/casa");
  return { ok: true, pushed };
}
