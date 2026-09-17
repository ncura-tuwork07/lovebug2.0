import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data";
import type { FamilyDocument } from "@/lib/types";
import { ProfileView } from "@/components/modules/ProfileView";

export const dynamic = "force-dynamic";

export default async function PerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { members, me, household } = await getSessionContext();
  const member = members.find((m) => m.id === id);
  if (!member || !household) notFound();

  const { data: docs } = await supabase.from("documents").select("*").eq("member_id", id).order("created_at", { ascending: false });

  const documents = await Promise.all(
    ((docs ?? []) as FamilyDocument[]).map(async (d) => {
      const { data } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Link href="/familia" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-faint">
        <ChevronLeft size={18} /> Familia
      </Link>
      <ProfileView member={member} documents={documents} isMe={me?.id === member.id} householdId={household.id} />
    </div>
  );
}
