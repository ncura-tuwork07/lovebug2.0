import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Household, Member, UserPasskey } from "@/lib/types";

// Cookie del "¿Quién sos?" (estilo Netflix): un mismo login puede representar a todo el hogar,
// y cada quien elige su perfil. No es un límite de seguridad (todo el hogar ve lo mismo por RLS);
// solo decide de quién son las cosas por defecto y el saludo de "Hoy".
export const PROFILE_COOKIE = "lb_profile";

// cache() evita repetir la consulta cuando el layout y la página piden lo mismo en el mismo request
// (por ejemplo, la lista de integrantes) — de lo contrario cada navegación pagaba esa ida y vuelta dos veces.
export const getMembers = cache(async (): Promise<Member[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("family_members").select("*").order("sort_order").order("created_at");
  return (data ?? []) as Member[];
});

// Círculo: familiares y amigos fuera del hogar (para eventos, cumples y sugerencias).
export const getContacts = cache(async (includeArchived = false): Promise<Contact[]> => {
  const supabase = await createClient();
  let q = supabase.from("contacts").select("*").order("name");
  if (!includeArchived) q = q.is("archived_at", null);
  const { data } = await q;
  return (data ?? []) as Contact[];
});

// Passkeys del login (huella/cara/PIN): son de la cuenta compartida, no de un integrante puntual.
export async function getPasskeys(): Promise<UserPasskey[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_passkeys")
    .select("id, user_id, device_label, transports, created_at, last_used_at")
    .order("created_at");
  return (data ?? []) as UserPasskey[];
}

// Perfil activo de esta sesión: el elegido en el selector de perfiles (cookie), guardado por
// dispositivo. Si el hogar tiene un solo perfil, no hay nada que elegir. Si tiene varios y este
// dispositivo todavía no eligió, no hay "yo" y el layout manda al selector — así entra cualquiera
// que use el mismo login (como en Netflix), sin asumir que sos el dueño de la cuenta.
// Recibe el usuario ya resuelto (por getSessionContext) para no volver a pedirlo a Supabase Auth.
async function getCurrentMember(members: Member[], user: User | null): Promise<Member | null> {
  if (!user) return null;
  const store = await cookies();
  const activeId = store.get(PROFILE_COOKIE)?.value;
  const active = activeId ? members.find((m) => m.id === activeId) : undefined;
  if (active) return active;
  if (members.length <= 1) return members[0] ?? null;
  return null;
}

// Hogar del usuario logueado (RLS ya limita a ese único hogar).
export const getHousehold = cache(async (): Promise<Household | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("households").select("*").limit(1).maybeSingle();
  if (!data) return null;
  return { ...data, settings: data.settings ?? {} } as Household;
});

export type SessionContext = {
  user: User | null;
  members: Member[];
  me: Member | null;
  household: Household | null;
};

// Todo lo que el layout y las páginas necesitan del usuario, en una sola pasada por request.
// Pedila siempre por acá (en vez de armar tu propio getMembers + "quién soy"): cache() hace que
// llamarla de nuevo en una página, después de que el layout ya la llamó, sea gratis.
// Pedimos el usuario y los datos del hogar en paralelo (no uno después del otro): si no hay sesión,
// RLS simplemente no devuelve filas, así que no perdemos nada por adelantar esas consultas.
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = await createClient();
  const [{ data: { user } }, members, household] = await Promise.all([supabase.auth.getUser(), getMembers(), getHousehold()]);
  if (!user) return { user: null, members: [], me: null, household: null };
  const me = await getCurrentMember(members, user);
  return { user, members, me, household };
});
