import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHousehold } from "@/lib/data";

// Una cuenta que inició sesión pero no es de ningún hogar (Lovebug es solo de Naza y Jaz, y ya
// no se pueden crear hogares nuevos): se le cierra la sesión y vuelve a "Entrar" con un aviso.
// Si la cuenta sí tiene hogar, no se cierra nada (así un link a esta ruta no desloguea a nadie).
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  if (await getHousehold()) return NextResponse.redirect(`${origin}/`);
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?error=sin-hogar`);
}
