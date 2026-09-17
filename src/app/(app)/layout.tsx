import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { LocationSharer } from "@/components/LocationSharer";
import { HouseholdProvider } from "@/components/HouseholdProvider";
import { UsageTracker } from "@/components/UsageTracker";
import { getSessionContext } from "@/lib/data";

export const dynamic = "force-dynamic";

// Layout de la app logueada: exige sesión y un hogar; si falta el hogar, manda a crearlo o unirse.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, me, household } = await getSessionContext();
  if (!user) redirect("/login");
  if (!me || !household) redirect("/empezar");

  return (
    <HouseholdProvider value={{ household, me }}>
      <UsageTracker />
      <LocationSharer memberId={me.id} enabled={me.share_location} />
      <div className="mx-auto w-full max-w-md flex-1">
        <Header />
        <main className="pb-28">{children}</main>
      </div>
      <BottomNav />
    </HouseholdProvider>
  );
}
