import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import type { ImportantDate, Reminder } from "@/lib/types";
import { RemindersView } from "@/components/modules/RemindersView";

export const dynamic = "force-dynamic";

export default async function VencimientosPage() {
  const supabase = await createClient();
  const [members, remRes, datesRes] = await Promise.all([
    getMembers(),
    supabase.from("reminders").select("*").order("due_date"),
    supabase.from("important_dates").select("*"),
  ]);
  const me = await getCurrentMember(members);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm" style={{ color: "#F59E0B" }}>
          Para que nada se pase
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Vencimientos y fechas</h1>
      </header>
      <RemindersView
        reminders={(remRes.data ?? []) as Reminder[]}
        dates={(datesRes.data ?? []) as ImportantDate[]}
        members={members}
        currentMemberId={me?.id ?? null}
      />
    </div>
  );
}
