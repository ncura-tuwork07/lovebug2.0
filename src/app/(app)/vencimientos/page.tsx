import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import type { Reminder } from "@/lib/types";
import { RemindersView } from "@/components/modules/RemindersView";

export const dynamic = "force-dynamic";

export default async function VencimientosPage() {
  const supabase = await createClient();
  const [{ members, me }, remRes] = await Promise.all([getSessionContext(), supabase.from("reminders").select("*").order("due_date")]);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "#F59E0B" }}>
          Para que nada se pase
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Vencimientos</h1>
        <p className="mt-1 text-meta text-ink-faint">Seguros, servicios, impuestos, cuotas. Los cumples y fechas importantes están en el Calendario.</p>
      </header>
      <RemindersView reminders={(remRes.data ?? []) as Reminder[]} members={members} currentMemberId={me?.id ?? null} />
    </div>
  );
}
