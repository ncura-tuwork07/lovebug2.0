-- Lovebug — migración 014: el plano de la casa.
-- Cada hogar dibuja sus ambientes en una grilla (1 cuadradito ≈ 1 metro, hasta 24 × 24 por piso),
-- a mano o con la IA a partir de fotos y de cómo la describen. Y cada integrante puede marcar en
-- qué ambiente está ("Estoy en la cocina"). Idempotente: se puede correr más de una vez.

create table if not exists home_rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null default 'otro' check (kind in (
    'living', 'comedor', 'cocina', 'dormitorio', 'bano', 'lavadero', 'patio', 'balcon',
    'garage', 'oficina', 'pasillo', 'juegos', 'otro'
  )),
  floor smallint not null default 0 check (floor between -1 and 3), -- 0 = planta baja
  x smallint not null default 0 check (x between 0 and 23),
  y smallint not null default 0 check (y between 0 and 23),
  w smallint not null default 4 check (w between 1 and 24),
  h smallint not null default 4 check (h between 1 and 24),
  created_at timestamptz not null default now()
);
create index if not exists home_rooms_household_idx on home_rooms (household_id);

alter table home_rooms enable row level security;
drop policy if exists "Household isolation" on home_rooms;
create policy "Household isolation" on home_rooms for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());

-- Dónde está cada uno dentro de la casa (lo marca la persona, o alguien por los chicos).
-- room_id null = salió de casa.
create table if not exists home_presence (
  member_id uuid primary key references family_members(id) on delete cascade,
  household_id uuid references households(id) on delete cascade default current_household_id(),
  room_id uuid references home_rooms(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists home_presence_household_idx on home_presence (household_id);

alter table home_presence enable row level security;
drop policy if exists "Household isolation" on home_presence;
create policy "Household isolation" on home_presence for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());
