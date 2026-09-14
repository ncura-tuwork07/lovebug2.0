# Lovebug 💕

La app de organización familiar de Nazareno y Jazmín: logística, calendario,
finanzas y metas, todo en un solo lugar, en tiempo real.

## Módulos (MVP)

- **Hoy** — briefing diario: tareas, logística y eventos del día.
- **Calendario** — próximos eventos de la familia.
- **Logística** — quién lleva a quién, a dónde y a qué hora.
- **Finanzas** — gastos compartidos y objetivos de ahorro.
- **Metas** — proyectos por semana / mes / trimestre.

## Poner en marcha

```bash
npm install
cp .env.local.example .env.local
```

Completá `.env.local` con las credenciales de tu proyecto de
[Supabase](https://supabase.com) (Project Settings → API), y corré el
contenido de [`supabase/schema.sql`](./supabase/schema.sql) en el SQL Editor
de Supabase para crear las tablas.

```bash
npm run dev
```

Sin `.env.local` configurado, la app funciona igual en **modo demo** con
datos de ejemplo, para poder ver y ajustar el diseño.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) (base de datos + auth en tiempo real)
- Deploy en [Vercel](https://vercel.com)
