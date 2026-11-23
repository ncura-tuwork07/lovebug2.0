# Traspaso: sesión "APP LOVEBUG con créditos" (25 al 27 de septiembre de 2026)

Todo lo que se hizo en la sesión en la nube "APP LOVEBUG con créditos", para seguir desde la
sesión "APP LOVEBUG" (o cualquier otra) sin perder nada. Está todo en `main` de
`nazacura95/lovebug`; el último commit de esta sesión es `725db67`. Los commits de esta sesión
llevan la línea `Claude-Session: …session_018my2GEWj6az3jKezH8ievz`.

## Antes de seguir

1. `git pull origin main`. La rama de esta sesión (`claude/pensive-rubin-6loiyn`) es igual a `main`.
2. Si tenés cambios locales sin subir sobre lo mismo (suscripción al calendario, micrófono global,
   alertas), lo que está en `main` ya los resuelve: compará antes de mezclar y quedate con `main`,
   salvo algo puntual que falte.
3. En el repo no hay migración `013` (va de la 012 a la 014). Si tenés una 013 local, revisá que
   no choque con la 014 ni con la 015.
4. Para publicar: push a `main` y Vercel publica solo. Naza autorizó publicar sin pedirle el OK.
5. Las migraciones las corre Naza a mano en el SQL Editor de Supabase.

## Qué se hizo

### Entrar y seguridad
- **Huella cada vez que se abre la app** (cookie `lb_unlock` firmada con HMAC), arreglos del
  bloqueo que se colgaba y del inicio con passkey. Commits `7da1ce4`, `27730a1`, `84373d0`.
- **Recuperar la contraseña**: el link del mail anda en cualquier navegador (flujo implícito,
  `/restablecer` y `/restablecer/nueva`). Commit `045971d`.
- Encabezados de seguridad y arreglos de contraste y de tamaño de botones (auditoría). Commit `4472297`.

### App de Android (`mobile/`)
- Capacitor 8 que abre la web, con la **huella nativa del celu** (como Mercado Pago).
  GitHub Actions compila la APK, la publica en Releases y la deja en `/lovebug-android.apk`;
  en Ajustes aparece "Descargar la app". Hoy está la **versión 3**. Commits `5d53c33`, `5d1a0c2`.
- El middleware manda "redirecciones suaves" (una página HTML) a la app, porque el proxy de
  Capacitor pierde las cookies en las redirecciones (`src/lib/supabase/middleware.ts`).
- La keystore está en el repo (`mobile/android/app/`) y su clave en `build.gradle`. **No
  cambiarla**: con otra firma los celus no pueden instalar la versión nueva encima.
- **Avisos en la app (Firebase)**: el código está listo, pero falta configurar Firebase (ver
  "Pendientes"). Sin Firebase la app sale igual, sin avisos. Commit `476b9fe`.

### Organizarse
- **Contale a Lovebug** (creado en la otra sesión): ahora además modifica y cancela lo que ya
  existe, con "Deshacer todo". Commit `ac5f94a`.
- **Micrófono global** arriba, en todas las pantallas, que abre Contale escuchando. Commit `7b62191`.
- **Primeros pasos** en Hoy y **Deshacer** durante 6 segundos después de borrar. Commit `59bdf06`.
- **Campanita de alertas**: vencimientos, cumples, traslados del día, topes de gasto y tareas
  atrasadas. Commit `530e018`.
- **Listas vacías** con un botón concreto ("Cargar el primer gasto"). Commit `c65c5df`.
- **Calendario unificado**: pestañas "Agenda" y "Fechas importantes"; Vencimientos queda solo
  para pagos. Commit `4f81488`.
- **Suscripción al calendario** (Google, iPhone, Outlook): link secreto `.ics` por hogar, que se
  puede renovar. Commit `b870188`.

### Familia
- **Rol** como desplegable; el texto libre solo aparece con "Otro". "¿Es menor de edad?" es una
  pregunta aparte, que se marca sola con el cumple. Commits `4f81488`, `9eddf30`.
- Fotos en Círculo, también al agregar a alguien nuevo. Commit `4f81488`.
- Mapa: ya no esconde a alguien cuya ubicación no estaba en pantalla. Commit `fc1d78a`.
- Del primer día de esta sesión: la pantalla para entrar con passkey (`5b1ac5d`), la navegación
  más rápida entre módulos y el arreglo del interruptor "menor" (`fc04cb0`).
- Lo que vino de la sesión "APP LOVEBUG" y se mezcló acá el 25/09 (`a359477`): elegir perfil,
  Círculo, cuentas recurrentes, borradores de finanzas, religiones abiertas, división de gastos de
  eventos y la primera versión de Contale (`6c96f3f`, `51f35d1`, `3c8e8ef`).

### Casa
- **Plano de la casa** en 3D (estilo Sims) y plano visto desde arriba. Se dibuja con IA a partir
  de fotos y de cómo la describen, o a mano. Cada uno marca en qué ambiente está. Migración
  `014`. Commits `90741d4`, `4777262`.
- **"¿Dónde estás?" y "Vení para acá"**: le llega un aviso a esa persona, y al abrir Lovebug le
  salta una hoja para contestar con un toque. A quien preguntó le llega la respuesta. Commit `725db67`.
- **Mapa del Merodeador**: tercera vista del plano, en pergamino, con las pisadas cuando alguien
  cambia de ambiente. Se abre con "Juro solemnemente…" y se cierra con "¡Travesura realizada!".
  Usa la migración `015` (preguntas, pisadas y tiempo real). Commit `725db67`.

### Admin y auditoría
- **Diagnóstico de velocidad** en `/admin`: mide cuánto tarda cada consulta a Supabase y
  recomienda la región de Vercel. Commit `1f01557`.
- Auditoría técnica, de experiencia de uso y visual en `docs/auditoria-2026-09.md`.

### Fuera del repo
- El manual en PDF y el video vertical (9:16) se mandaron por la conversación; no están en el
  repo. Usan una familia inventada ("Los García"), nunca datos reales.

## Pendientes de Naza (configuración, una sola vez)

1. **Migración 015** en Supabase: entrar a Casa como admin, tocar "Copiar el SQL", pegarlo en el
   SQL Editor, dar Run y tocar "Ya lo corrí". Sin esto no aparecen "¿Dónde estás?" ni las pisadas
   guardadas (el plano anda igual).
2. **Recuperar la contraseña**: en Supabase → Authentication → URL Configuration, poner como Site
   URL `https://lovebug-wheat.vercel.app` y sumar `https://lovebug-wheat.vercel.app/**` en
   Redirect URLs.
3. **Velocidad**: `/admin` → Velocidad; si sale ⚠️, cambiar la región de las funciones en Vercel
   (Settings → Functions → Function Region) y hacer Redeploy.
4. **Avisos en la app de Android (Firebase)**:
   1. Crear el proyecto en Firebase y agregarle una app Android con el paquete `app.lovebug.familia`.
   2. Bajar el `google-services.json` y subirlo a `mobile/android/app/`, o cargarlo como secreto
      `GOOGLE_SERVICES_JSON` en GitHub. Ese archivo no es secreto: viaja dentro de la APK.
   3. Generar la clave de la cuenta de servicio (esa sí es secreta) y cargarla en Vercel como
      `FIREBASE_SERVICE_ACCOUNT`. Después, Redeploy.
   4. Instalar la APK nueva y activar los avisos en Ajustes → "Avisos en este celu".
5. **Decisión de marca**: el botón coral con letra blanca no llega al contraste AA. Las opciones
   están en la auditoría.

## Sin probar en un celu real

Se probó con un Supabase simulado y Playwright; en un teléfono de verdad falta probar:
- La app de Android: instalación, huella, que la sesión se mantenga, ubicación y cámara.
- Los avisos de Firebase, una vez configurado.
- El dibujo de la casa con IA a partir de fotos reales.
- Contale modificando y cancelando, con la IA real.
- Recuperar la contraseña, con la configuración real de Supabase.
- "¿Dónde estás?" entre dos celus, y el tiempo real del plano.

## Ideas que quedaron para después

- Rastreador GPS para los chicos (compatible con Traccar): espera a que compren el dije.
- Pasar a Next 16 (resuelve el aviso de seguridad de `postcss`, que solo se usa al compilar).
- Vercel Speed Insights, para medir la velocidad en los celulares de la familia.
- Una paleta de colores de integrantes un tono más oscura, para el contraste.

## Dónde está cada cosa

| Tema | Archivos |
| --- | --- |
| Huella y bloqueo | `src/lib/appLock.ts`, `src/components/auth/*`, `src/app/actions/nativeUnlock.ts` |
| App Android | `mobile/`, `src/lib/native.ts`, `src/components/auth/NativeUnlock.tsx`, `.github/workflows/android.yml` |
| Avisos | `src/lib/push.ts` (web y app), `src/lib/fcm.ts`, `src/components/PushSetup.tsx`, `src/components/NativePushBridge.tsx` |
| Alertas | `src/lib/alerts.ts`, `src/app/api/alertas/route.ts`, `src/components/AlertsBell.tsx` |
| Calendario suscribible | `src/lib/calendarFeed.ts`, `src/app/api/calendario/[token]/route.ts`, `src/components/modules/CalendarSubscribe.tsx` |
| Contale y micrófono | `src/components/assistant/Contale.tsx`, `src/lib/assistant.ts`, `src/components/ui/useDictation.ts` |
| Deshacer | `src/app/actions/undo.ts`, `src/components/ui/Undo.tsx` |
| Casa | `src/lib/home.ts`, `src/lib/homePlan.ts`, `src/app/actions/home.ts`, `src/app/api/plano`, `src/app/api/casa/avisos`, `src/components/modules/HomePlan.tsx`, `MaraudersMap.tsx`, `RoomGrid.tsx`, `src/components/HomePingInbox.tsx` |
| SQL desde el celu | `src/lib/homeMigration.ts` tiene copias de la 014 y la 015: si cambia una migración, actualizar la copia |
| Velocidad | `src/lib/speed.ts`, `src/app/(app)/admin/page.tsx` |
| Roles | `src/lib/roles.ts`, `RolePicker` en `src/components/ui/Field.tsx` |

## Variables de entorno en Vercel

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`CRON_SECRET`, `NEXT_PUBLIC_APP_URL` y, cuando esté, `FIREBASE_SERVICE_ACCOUNT`.

- `SUPABASE_SERVICE_ROLE_KEY` también firma la huella y los links del calendario: si se
  renueva, hay que volver a poner la huella y volver a suscribirse al calendario.
- Los valores nunca van en el repo ni en el chat: los carga Naza en Vercel.

## Lo que pidió Naza (vale para todo)

- Español rioplatense, cálido, nunca corporativo.
- Rol: desplegable, con texto libre solo en "Otro".
- Que el calendario y las fechas importantes no confundan: todo en un solo lugar.
- Nada de datos reales de la familia en demos, manuales ni videos.
- Los secretos los carga Naza en Vercel; nunca se pegan en formularios ni en el chat.
- Publicar en `main` sin pedir permiso está autorizado.

## Cómo se probó (para repetirlo)

- Un Supabase simulado (un servidor HTTP que imita auth y PostgREST con la familia de ejemplo
  "Los García"), un Anthropic simulado (SSE) y Playwright con Chromium. Estos scripts no quedaron
  guardados: vivían en la carpeta temporal de la sesión en la nube.
- Para armarlos de nuevo:
  - Compilar con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` apuntando al
    simulado, porque se fijan al compilar.
  - Entrar con las cookies `sb-<ref>-auth-token`, `lb_unlock` (firmada con
    `SUPABASE_SERVICE_ROLE_KEY`) y `lb_profile` (el id del integrante).
  - Next reutiliza los `fetch` idénticos dentro de un mismo render, así que para medir tiempos
    hay que usar direcciones distintas.
