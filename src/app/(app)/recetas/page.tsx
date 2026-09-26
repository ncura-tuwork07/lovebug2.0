import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/lib/types";
import { RecipesList } from "@/components/modules/RecipesList";

export const dynamic = "force-dynamic";

export default async function RecetasPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("*").order("title");

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="lb-tint text-sm" style={{ "--tint": "#0EA5A5" } as CSSProperties}>
          Las de siempre, con sus ingredientes
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Recetas</h1>
      </header>
      <RecipesList recipes={(data ?? []) as Recipe[]} />
    </div>
  );
}
