import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMembers } from "@/lib/data";
import type { Expense, FamilyEvent, PantryItem, Recipe, ShoppingItem, Task } from "@/lib/types";
import { EventDetail } from "@/components/modules/EventDetail";

export const dynamic = "force-dynamic";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: event }, members, recipesRes, pantryRes, shopRes, tasksRes, expRes] = await Promise.all([
    supabase.from("family_events").select("*").eq("id", id).maybeSingle(),
    getMembers(),
    supabase.from("recipes").select("*").order("title"),
    supabase.from("pantry_items").select("*"),
    supabase.from("shopping_items").select("*").eq("event_id", id).order("checked").order("created_at"),
    supabase.from("daily_tasks").select("*").eq("event_id", id).order("done").order("due_date"),
    supabase.from("expenses").select("*").eq("event_id", id).order("spent_at", { ascending: false }),
  ]);
  if (!event) notFound();
  const me = await getCurrentMember(members);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <Link href="/eventos" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-faint">
        <ChevronLeft size={18} /> Eventos
      </Link>
      <EventDetail
        event={event as FamilyEvent}
        recipes={(recipesRes.data ?? []) as Recipe[]}
        pantry={(pantryRes.data ?? []) as PantryItem[]}
        shopping={(shopRes.data ?? []) as ShoppingItem[]}
        tasks={(tasksRes.data ?? []) as Task[]}
        expenses={(expRes.data ?? []) as Expense[]}
        members={members}
        currentMemberId={me?.id ?? null}
      />
    </div>
  );
}
