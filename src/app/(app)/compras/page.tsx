import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import type { ShoppingItem } from "@/lib/types";
import { ShoppingList } from "@/components/modules/ShoppingList";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const supabase = await createClient();
  const [members, { data }, { data: events }] = await Promise.all([
    getMembers(),
    supabase.from("shopping_items").select("*").order("checked").order("created_at"),
    supabase.from("family_events").select("id, title"),
  ]);
  const me = await getCurrentMember(members);
  const eventNames = Object.fromEntries((events ?? []).map((e) => [e.id, e.title]));

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: "#FF9F43" }}>
            Para el super
          </p>
          <h1 className="text-h1 font-display font-bold text-ink">Compras</h1>
        </div>
        <Link href="/despensa" className="lb-chip min-h-9 border-[1.5px] border-line text-xs font-semibold text-ink-soft">
          Despensa
        </Link>
      </header>
      <ShoppingList items={(data ?? []) as ShoppingItem[]} members={members} currentMemberId={me?.id ?? null} eventNames={eventNames} />
    </div>
  );
}
