import { createClient } from "@/lib/supabase/server";
import type { PantryItem } from "@/lib/types";
import { PantryList } from "@/components/modules/PantryList";

export const dynamic = "force-dynamic";

export default async function DespensaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("pantry_items").select("*").order("category").order("name");

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "#8B5CF6" }}>
          Lo que ya tenemos en casa
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Despensa</h1>
      </header>
      <PantryList items={(data ?? []) as PantryItem[]} />
    </div>
  );
}
