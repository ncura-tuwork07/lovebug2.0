# Lovebug

App de organización familiar compartida (PWA y app Android), **solo para Naza y Jaz** (y sus hijos como perfiles).
Desde noviembre 2026 no hay registro, ni alta de hogares, ni invitaciones, ni landing pública: no volver a agregarlos.

- Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase. Deploy en Vercel (preset Next.js).
- Rutas: `src/app/(app)` (logueado, con header y barra) y `src/app/(public)` (login, recuperar contraseña, perfil, pagar).
  `middleware.ts` protege todo salvo las públicas; sin sesión todo manda a `/login`. Una cuenta sin hogar va a
  `/auth/salir` (cierra la sesión).
- Hogares (quedó de cuando era multi-hogar; hoy hay uno solo): `households` + `household_id` en cada tabla con default `current_household_id()`; RLS por hogar.
  Migraciones en `supabase/migrations/` (se corren a mano en el SQL Editor). Storage: rutas `<household_id>/<member_id>/...`.
- Roles de integrantes: texto libre (`role`) + `is_child` para los menores. Módulos activables en `households.settings`.
- Admin (Naza y Jaz, tabla `app_admins`): `/admin` con métricas agregadas de `profiles` y `usage_events`.
- Tokens de diseño y clases `lb-*` en `src/app/globals.css`; no usar variantes `dark:`.
- Copy en español rioplatense, cálido, nunca corporativo.
- Qué se hizo en la sesión en la nube de septiembre 2026 (app Android, avisos, Casa, Mapa del Merodeador) y qué
  configuración falta: `docs/traspaso-app-lovebug-con-creditos.md`.
- Sin IA: no hay `ANTHROPIC_API_KEY` (Naza no quiere pagar créditos de la API). Toda función con IA tiene que
  esconderse sola sin la clave (como Contale y "Dibujarla con IA" en Casa).
