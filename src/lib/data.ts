import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Household, Member } from "@/lib/types";

export async function getMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("family_members").select("*").order("sort_order").order("created_at");
  return (data ?? []) as Member[];
}

export async function getCurrentMember(members: Member[]): Promise<Member | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return members.find((m) => m.user_id === user.id) ?? null;
}

// Hogar del usuario logueado (RLS ya limita a ese único hogar).
export async function getHousehold(): Promise<Household | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("households").select("*").limit(1).maybeSingle();
  if (!data) return null;
  return { ...data, settings: data.settings ?? {} } as Household;
}

export type SessionContext = {
  user: User | null;
  members: Member[];
  me: Member | null;
  household: Household | null;
};

// Todo lo que el layout y las páginas necesitan del usuario, en una sola pasada por request.
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, members: [], me: null, household: null };
  const [members, household] = await Promise.all([getMembers(), getHousehold()]);
  return { user, members, me: members.find((m) => m.user_id === user.id) ?? null, household };
});
