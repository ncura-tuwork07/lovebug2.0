import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getContacts, getSessionContext } from "@/lib/data";
import type { EventAttachment, EventGuest, EventItem, Expense, FamilyEvent, PantryItem, Recipe, ShoppingItem, Task } from "@/lib/types";
import { EventDetail } from "@/components/modules/EventDetail";

export const dynamic = "force-dynamic";

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: event }, { members, me, household }, contacts, recipesRes, pantryRes, shopRes, tasksRes, expRes, guestsRes, itemsRes, photosRes] =
    await Promise.all([
      supabase.from("family_events").select("*").eq("id", id).maybeSingle(),
      getSessionContext(),
      getContacts(),
      supabase.from("recipes").select("*").order("title"),
      supabase.from("pantry_items").select("*"),
      supabase.from("shopping_items").select("*").eq("event_id", id).order("checked").order("created_at"),
      supabase.from("daily_tasks").select("*").eq("event_id", id).order("done").order("due_date"),
      supabase.from("expenses").select("*").eq("event_id", id).order("spent_at", { ascending: false }),
      supabase.from("event_guests").select("*").eq("event_id", id).order("sort_order").order("created_at"),
      supabase.from("event_items").select("*").eq("event_id", id).order("done").order("created_at"),
      supabase.from("event_attachments").select("*").eq("event_id", id).in("kind", ["foto", "video", "audio"]).order("created_at"),
    ]);
  if (!event || !household) notFound();

  // URLs firmadas (bucket privado) para tickets y fotos, válidas por una hora.
  const expenses = (expRes.data ?? []) as Expense[];
  const photos = (photosRes.data ?? []) as EventAttachment[];
  const paths = [...expenses.map((e) => e.receipt_path).filter((p): p is string => !!p), ...photos.map((p) => p.file_path)];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("documents").createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <Link href="/eventos" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-faint">
        <ChevronLeft size={18} /> Eventos
      </Link>
      <EventDetail
        event={event as FamilyEvent}
        guests={(guestsRes.data ?? []) as EventGuest[]}
        contacts={contacts}
        items={(itemsRes.data ?? []) as EventItem[]}
        photos={photos.map((p) => ({ ...p, url: signed.get(p.file_path) ?? null }))}
        recipes={(recipesRes.data ?? []) as Recipe[]}
        pantry={(pantryRes.data ?? []) as PantryItem[]}
        shopping={(shopRes.data ?? []) as ShoppingItem[]}
        tasks={(tasksRes.data ?? []) as Task[]}
        expenses={expenses.map((e) => ({ ...e, receipt_url: e.receipt_path ? signed.get(e.receipt_path) ?? null : null }))}
        members={members}
        currentMemberId={me?.id ?? null}
        householdId={household.id}
      />
    </div>
  );
}
