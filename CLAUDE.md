# Lovebug

App privada de organización familiar para Nazareno y Jazmín (login solo para sus dos cuentas).

- Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase. Deploy en Vercel (preset Next.js).
- Tokens de diseño y clases `lb-*` en `src/app/globals.css`; no usar variantes `dark:`.
- Colores por persona: `--color-naza`, `--color-jaz`, etc. Ver `src/components/ui/PersonChip.tsx`.
- Esquema de base en `supabase/schema.sql`; se corre a mano en el SQL Editor de Supabase.
- Copy en español rioplatense, cálido, nunca corporativo.
