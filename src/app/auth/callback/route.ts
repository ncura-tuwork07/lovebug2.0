import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { markDeviceUnlocked } from "@/lib/appLock";

// Destino de los links de email (confirmación de cuenta, recuperación de contraseña).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextRaw = searchParams.get("next") ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  if (!ok) return NextResponse.redirect(`${origin}/login?error=link`);
  // El link de email ya prueba quién es: no hace falta pedir la huella de nuevo al entrar.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await markDeviceUnlocked(user.id);
  return NextResponse.redirect(`${origin}${next}`);
}
