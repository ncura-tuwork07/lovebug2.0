-- Lovebug — migración 004: despensa, recetas y eventos. Idempotente.

-- ───────────────────────── Despensa ─────────────────────────
create table if not exists pantry_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'u',
  category text not null default 'almacen'
    check (category in ('almacen', 'frescos', 'limpieza', 'chicos', 'farmacia', 'otro')),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists pantry_items_name_key on pantry_items (lower(name));

-- ───────────────────────── Recetas ─────────────────────────
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  portions int not null default 4 check (portions > 0),
  ingredients jsonb not null default '[]'::jsonb, -- [{name, quantity, unit}]
  steps text,
  prep_minutes int,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────────────────────── Eventos ─────────────────────────
create table if not exists family_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  guests int not null default 0 check (guests >= 0),
  budget numeric(12, 2),
  notes text,
  menu jsonb not null default '[]'::jsonb, -- [{recipe_id|null, title, portions}]
  status text not null default 'planning' check (status in ('planning', 'done')),
  created_at timestamptz not null default now()
);

-- Vínculos: compras, tareas, gastos y evento de calendario asociados a un evento
alter table shopping_items add column if not exists event_id uuid references family_events(id) on delete set null;
alter table daily_tasks add column if not exists event_id uuid references family_events(id) on delete set null;
alter table expenses add column if not exists event_id uuid references family_events(id) on delete set null;
alter table calendar_events add column if not exists event_id uuid references family_events(id) on delete cascade;

-- Menú semanal puede apuntar a una receta
alter table meal_plans add column if not exists recipe_id uuid references recipes(id) on delete set null;
alter table meal_plans add column if not exists portions int;

-- ───────────────────────── RLS ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['pantry_items', 'recipes', 'family_events']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Authenticated full access" on %I', t);
    execute format(
      'create policy "Authenticated full access" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
