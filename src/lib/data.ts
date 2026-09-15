import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/types";

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
