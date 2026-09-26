import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "./is-configured";
import { APP_LOCK_COOKIE, APP_LOCK_TTL_SECONDS, appLockEnabled, signUnlock, verifyUnlock } from "@/lib/appLock";

// Rutas que se pueden ver sin sesión.
const PUBLIC_PREFIXES = ["/bienvenida", "/login", "/registro", "/invitacion", "/restablecer", "/auth", "/pagar"];
// Con sesión iniciada, estas rutas mandan directo a la app.
const GUEST_ONLY = ["/bienvenida", "/login", "/registro"];
// La pantalla del bloqueo por huella: nunca se bloquea a sí misma.
const LOCK_PATH = "/bloqueo";

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

  // getClaims (lo que recomienda Supabase para el middleware): con claves de firma asimétricas
  // verifica el token acá mismo, sin ir a la red en cada pedido; con la clave clásica consulta al
  // servidor como getUser. En los dos casos renueva la sesión si está por vencer.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const { pathname } = request.nextUrl;

  if (!userId) {
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

  // Solo al ver la página: las server actions de /login y /registro (POST) corren justo después de
  // iniciar sesión, y si las redirigimos acá nunca se ejecutan (por ejemplo, marcar el celu como
  // desbloqueado después de entrar con la contraseña).
  if (request.method === "GET" && startsWithAny(pathname, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Bloqueo con huella: la sesión de Supabase puede seguir viva, pero si hace rato que este
  // dispositivo no mostró la huella (se cerró la app, quedó en segundo plano, la agarró otro),
  // no deja ver nada del hogar hasta volver a mostrarla — igual que una app de banco.
  // Solo se aplica a pedidos GET (ver una pantalla): las server actions (POST) son mutaciones de
  // una pantalla que ya se mostró, y si las redirigimos acá se rompen a mitad de camino (por
  // ejemplo, perder lo que alguien tipeó al crear el hogar porque tardó más de un minuto en cargar).
  if (appLockEnabled() && request.method === "GET" && pathname !== LOCK_PATH && !startsWithAny(pathname, PUBLIC_PREFIXES)) {
    const unlocked = await verifyUnlock(request.cookies.get(APP_LOCK_COOKIE)?.value, userId);
    if (!unlocked) {
      const url = request.nextUrl.clone();
      url.pathname = LOCK_PATH;
      url.search = pathname !== "/" ? `?next=${encodeURIComponent(pathname + request.nextUrl.search)}` : "";
      return NextResponse.redirect(url);
    }
    // Sigue activo: renovamos el vencimiento, como la sesión de Supabase.
    const refreshed = await signUnlock(userId);
    if (refreshed) {
      supabaseResponse.cookies.set(APP_LOCK_COOKIE, refreshed, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: APP_LOCK_TTL_SECONDS,
      });
    }
  }

  return supabaseResponse;
}
