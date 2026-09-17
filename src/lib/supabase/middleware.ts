import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "./is-configured";

// Rutas que se pueden ver sin sesión.
const PUBLIC_PREFIXES = ["/bienvenida", "/login", "/registro", "/invitacion", "/restablecer", "/auth"];
// Con sesión iniciada, estas rutas mandan directo a la app.
const GUEST_ONLY = ["/bienvenida", "/login", "/registro"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    // Modo demo: sin Supabase configurado todavía, no exigimos login.
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    // Sin sesión, la raíz muestra la landing (misma URL, sin redirigir).
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/bienvenida";
      return NextResponse.rewrite(url);
    }
    if (startsWithAny(pathname, PUBLIC_PREFIXES)) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + request.nextUrl.search)}` : "";
    return NextResponse.redirect(url);
  }

  if (startsWithAny(pathname, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
