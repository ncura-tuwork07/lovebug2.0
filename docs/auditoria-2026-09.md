# Auditoría de Lovebug — septiembre 2026

Recorrido automático de las 25 pantallas, en celular (360 px) y en modo claro y oscuro, con
axe-core (accesibilidad WCAG 2 AA), chequeo de errores de JavaScript, desbordes horizontales y
tamaño de botones. Además se revisaron el build, las dependencias y los endpoints.

## Resumen

| Área | Antes | Después |
| --- | --- | --- |
| Errores de JavaScript | 0 | 0 |
| Pantallas que se desbordan de costado | 0 | 0 |
| Fallas de contraste (por pantalla, modo claro) | 7 a 47 | 0 a 3 (botón coral de marca y chips de color) |
| Botones chicos (< 32 px) | foto de perfil, títulos de Hoy, interruptores de Ajustes, zoom del mapa | agrandados |
| Encabezados de seguridad | ninguno | nosniff, sin iframes, referrer y permisos acotados |

## Técnica

**Arreglado**
- Las flechas de mes en Finanzas recargaban la app entera; ahora navegan al instante.
- `/api/track` aceptaba cualquier texto como "pantalla": ahora solo rutas (`/…`), así nadie
  puede inflar los contadores de la IA del hogar.
- Encabezados de seguridad en todas las respuestas (`next.config.ts`). Permissions-Policy deja
  solo ubicación, micrófono, cámara y passkeys, y solo desde Lovebug.
- Listas con marcado inválido (un `<p>` dentro de `<ul>`) en Finanzas y Círculo.
- Textos de ejemplo de la app con nombres reales de la familia (Juani, Jaz, Salvi, Naza) que
  veían todos los hogares: ahora son genéricos. Se mantuvo "Hecha por Naza y Jaz" en la
  bienvenida, que es la historia de la marca.

**Estado**
- Peso: 103 kB de JavaScript compartido; ninguna pantalla pasa los 205 kB en la primera carga.
- `npm audit`: 1 aviso alto en `postcss` dentro de Next.js. Solo se usa al compilar (nuestro
  propio CSS), así que el riesgo real es bajo. Se resuelve con Next 16 (cambio grande): conviene
  planificarlo aparte.
- Endpoints: `/api/cron/*` exige `CRON_SECRET`; `/api/contale` y `/api/plano` exigen sesión y
  tienen tope diario por hogar; las tablas nuevas (014) tienen RLS por hogar.

**Recomendado**
1. **Región de Vercel = región de Supabase** (lo que más impacta en la velocidad). Si Supabase
   está en São Paulo y las funciones de Vercel en EE.UU. (lo que viene por defecto), cada
   consulta cruza el continente ida y vuelta, y una pantalla hace varias. Mirá la región en
   Supabase (Settings → General) y poné la misma en Vercel (Settings → Functions → Region;
   São Paulo es `gru1`).
2. Activar Vercel Speed Insights para medir la velocidad real en los celulares de la familia.
3. Presencia en tiempo real en Casa (hoy se actualiza cada 30 s).

## UX

**Arreglado**
- Rol de los integrantes: era texto libre con sugerencias que en Android casi no se ven, y
  arrancaba en "Adulto/a" (se confundía con la edad). Ahora es un desplegable con "Otro (lo
  escribo)", arranca vacío y la edad es una pregunta aparte ("¿Es menor de edad?") que se marca
  sola con el cumple.
- Tocar el título de un selector Sí/No lo cambiaba sin querer (el `<label>` "clickeaba" el primer
  botón). Pasaba también con los colores y los ingredientes.
- Calendario y "Fechas importantes" estaban en dos lugares y confundían. Ahora el Calendario
  junta todo (eventos, cumples, aniversarios y vencimientos, día por día) con una pestaña de
  fechas importantes; Vencimientos queda solo para pagos.
- Círculo: foto al agregar a alguien nuevo (antes solo al editar), de la cámara o la galería.
- Hoy: el título decía "Sábado, 26 De Septiembre" (mayúscula en "De").

**Recomendado**
1. **Huella nativa**: en el navegador, Android muestra la huella a través del administrador de
   contraseñas de Google (por eso se ve "de Google"). Para el cartel propio del celular, como
   Mercado Pago, hace falta empaquetar Lovebug como app nativa (Capacitor). Es un proyecto aparte
   de 1 o 2 semanas que además habilita publicar en las tiendas.
2. Una lista de "Primeros pasos" en Hoy para hogares nuevos: sumar integrantes, invitar a la
   pareja, activar avisos y cargar cumples.
3. "Deshacer" (5 segundos) después de borrar o de aplicar Contale, en vez de confirmaciones.
4. Estados vacíos con un botón concreto ("Cargar el primer gasto") además del "Tocá +".

## UI

**Arreglado**
- Contraste AA de todo el texto chico de color: en modo claro los acentos van un poco más
  oscuros y en modo oscuro un poco más claros (`--text-*` y `.lb-tint` en `globals.css`). Los
  fondos y los botones mantienen la paleta de marca.
- Grises de texto (`ink-faint`, `ink-ghost`) ajustados en los dos temas.
- Chips y avatares de cada integrante eligen letra blanca o tinta según su color (en ámbar o
  verde claro el blanco no se leía).
- Los desplegables ahora tienen flechita: sin ella parecían campos de texto.
- La categoría "Plata" en el calendario no se veía de noche (tinta sobre tinta).

**Queda a decidir**
- El botón coral con letra blanca tiene contraste 3:1 (AA pide 4,5:1 para ese tamaño). Opciones:
  un coral un poco más oscuro para los botones (`#E8474C`) o texto de 18 px en negrita. Es una
  decisión de marca.
- Los colores medios de los integrantes (azul, rosa) no llegan a 4,5:1 ni con blanco ni con
  tinta. Se podría ofrecer una paleta un tono más oscura.
