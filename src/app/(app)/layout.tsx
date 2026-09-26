import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { LocationSharer } from "@/components/LocationSharer";
import { HouseholdProvider } from "@/components/HouseholdProvider";
import { UsageTracker } from "@/components/UsageTracker";
import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { NavigationProgress } from "@/components/NavigationProgress";
import { NativePushBridge } from "@/components/NativePushBridge";
import { getSessionContext } from "@/lib/data";
import { UndoProvider } from "@/components/ui/Undo";
import { ContaleProvider } from "@/components/assistant/Contale";
import { todayAR } from "@/lib/format";

export const dynamic = "force-dynamic";

// Layout de la app logueada: exige sesión y un hogar; si falta el hogar, manda a crearlo o unirse.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, me, household, members } = await getSessionContext();
  if (!user) redirect("/login");
  if (!household) redirect("/empezar");
  if (!me) redirect(members.length > 1 ? "/perfil" : "/familia");

  return (
    <HouseholdProvider value={{ household, me, members }}>
      <NavigationProgress />
      <UsageTracker />
      <PasskeyPrompt />
      <NativePushBridge />
      <LocationSharer memberId={me.id} enabled={me.share_location} />
      <UndoProvider>
        <ContaleProvider enabled={Boolean(process.env.ANTHROPIC_API_KEY)} members={members} today={todayAR()}>
          <div className="mx-auto w-full max-w-md flex-1">
            <Header />
            <main className="pb-28">{children}</main>
          </div>
          <BottomNav />
        </ContaleProvider>
      </UndoProvider>
    </HouseholdProvider>
  );
}
