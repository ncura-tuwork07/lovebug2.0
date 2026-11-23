# Lovebug

App de organización familiar compartida (PWA). Nació para Nazareno y Jazmín y ahora es multi-hogar: cualquier
familia, pareja o grupo de amigos crea su hogar, invita con un link y ve solo lo suyo.

- Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase. Deploy en Vercel (preset Next.js).
- Rutas: `src/app/(app)` (logueado, con header y barra) y `src/app/(public)` (landing, login, registro, invitación).
  `middleware.ts` protege todo salvo las públicas; `/` es la landing para anónimos (rewrite a `/bienvenida`).
- Hogares: `households` + `household_id` en cada tabla con default `current_household_id()`; RLS por hogar.
  Migraciones en `supabase/migrations/` (se corren a mano en el SQL Editor). Storage: rutas `<household_id>/<member_id>/...`.
- Roles de integrantes: texto libre (`role`) + `is_child` para los menores. Módulos activables en `households.settings`.
- Admin (Naza y Jaz, tabla `app_admins`): `/admin` con métricas agregadas de `profiles` y `usage_events`.
- Tokens de diseño y clases `lb-*` en `src/app/globals.css`; no usar variantes `dark:`.
- Copy en español rioplatense, cálido, nunca corporativo.
- Qué se hizo en la sesión en la nube de septiembre 2026 (app Android, avisos, Casa, Mapa del Merodeador) y qué
  configuración falta: `docs/traspaso-app-lovebug-con-creditos.md`.
