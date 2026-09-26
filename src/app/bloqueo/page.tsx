import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppLockScreen } from "@/components/auth/AppLockScreen";

export const dynamic = "force-dynamic";

// Pantalla de bloqueo: la sesión de Supabase puede seguir viva, pero hace rato que este
// dispositivo no mostró la huella, así que no se ve nada del hogar hasta volver a mostrarla.
// Fuera de (app) y (public) a propósito: no arrastra Header, BottomNav ni datos del hogar.
export default async function BloqueoPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AppLockScreen next={next && next.startsWith("/") ? next : "/"} />;
}
