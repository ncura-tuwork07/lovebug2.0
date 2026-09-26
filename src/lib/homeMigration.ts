// Copia de supabase/migrations/014_plano_de_la_casa.sql (sin comentarios) para el botón "Copiar el SQL"
// de /casa, así se puede crear desde el celu. Si cambia la migración, actualizar esto también.
export const HOME_MIGRATION_SQL = `create table if not exists home_rooms (
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
`;

// Link directo al SQL Editor del proyecto (https://<ref>.supabase.co → dashboard/project/<ref>/sql/new).
export function supabaseSqlEditorUrl(): string | null {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return host.endsWith(".supabase.co") ? `https://supabase.com/dashboard/project/${host.split(".")[0]}/sql/new` : null;
  } catch {
    return null;
  }
}
