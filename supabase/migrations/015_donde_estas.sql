-- Lovebug — migración 015: "¿Dónde estás?", "Vení para acá" y las pisadas del Mapa del Merodeador.
-- Un integrante le pregunta a otro en qué parte de la casa está (o lo llama a un ambiente), le
-- llega un aviso y contesta desde la app. Cada cambio de ambiente queda anotado un par de días
-- para dibujar las pisadas. Idempotente: se puede correr más de una vez. Necesita la 014.

create table if not exists home_pings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  from_member uuid not null references family_members(id) on delete cascade,
  to_member uuid not null references family_members(id) on delete cascade,
  kind text not null check (kind in ('donde', 'veni')),
  room_id uuid references home_rooms(id) on delete set null, -- "vení": adónde
  reply text check (reply in ('aca', 'afuera', 'voy', 'ratito', 'no')),
  reply_room_id uuid references home_rooms(id) on delete set null, -- "¿dónde estás?": dónde contestó
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists home_pings_to_idx on home_pings (to_member, created_at desc);
create index if not exists home_pings_from_idx on home_pings (from_member, created_at desc);

alter table home_pings enable row level security;
drop policy if exists "Household isolation" on home_pings;
create policy "Household isolation" on home_pings for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());

create table if not exists home_moves (
  id bigint generated always as identity primary key,
  household_id uuid references households(id) on delete cascade default current_household_id(),
  member_id uuid not null references family_members(id) on delete cascade,
  from_room uuid references home_rooms(id) on delete set null,
  to_room uuid references home_rooms(id) on delete set null,
  moved_at timestamptz not null default now()
);
create index if not exists home_moves_household_idx on home_moves (household_id, moved_at desc);

alter table home_moves enable row level security;
drop policy if exists "Household isolation" on home_moves;
create policy "Household isolation" on home_moves for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());

-- Tiempo real: el plano, las pisadas y los avisos se ven al instante en los otros celus.
do $$ begin
  alter publication supabase_realtime add table home_presence;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table home_pings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table home_moves;
exception when duplicate_object then null; end $$;
