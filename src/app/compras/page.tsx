import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import type { ShoppingItem } from "@/lib/types";
import { ShoppingList } from "@/components/modules/ShoppingList";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const supabase = await createClient();
  const [members, { data }] = await Promise.all([
    getMembers(),
    supabase.from("shopping_items").select("*").order("checked").order("created_at"),
  ]);
  const me = await getCurrentMember(members);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "#FF9F43" }}>
          Para el super
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Compras</h1>
      </header>
      <ShoppingList items={(data ?? []) as ShoppingItem[]} members={members} currentMemberId={me?.id ?? null} />
    </div>
  );
}
