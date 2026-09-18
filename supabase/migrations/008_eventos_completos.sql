-- Lovebug — migración 008: eventos completos. Invitados con nombre y porciones, compras extra
-- (bebidas, decoración…), tickets adjuntos a gastos y recuerdos (fotos + nota). Idempotente.

-- Invitados con nombre propio; "portions" guarda porciones especiales por plato { "<key del plato>": n }.
create table if not exists event_guests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  event_id uuid not null references family_events(id) on delete cascade,
  name text not null,
  member_id uuid references family_members(id) on delete set null,
  is_child boolean not null default false,
  confirmed boolean not null default true,
  notes text,
  portions jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists event_guests_event_idx on event_guests (event_id);
create index if not exists event_guests_household_idx on event_guests (household_id);

-- Compras extra del evento (lo que no sale de una receta): bebidas, decoración, vajilla, otros.
create table if not exists event_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  event_id uuid not null references family_events(id) on delete cascade,
  category text not null default 'otro' check (category in ('comida', 'bebidas', 'decoracion', 'vajilla', 'otro')),
  name text not null,
  quantity text,
  store text,
  estimated_cost numeric(12, 2),
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists event_items_event_idx on event_items (event_id);
create index if not exists event_items_household_idx on event_items (household_id);

-- Fotos del evento (recuerdos) y tickets sueltos.
create table if not exists event_attachments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  event_id uuid not null references family_events(id) on delete cascade,
  kind text not null default 'foto' check (kind in ('foto', 'ticket')),
  title text,
  file_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);
create index if not exists event_attachments_event_idx on event_attachments (event_id);
create index if not exists event_attachments_household_idx on event_attachments (household_id);

-- Nota de recuerdo al cerrar el evento, y ticket/comprobante en cada gasto.
alter table family_events add column if not exists memory_note text;
alter table expenses add column if not exists receipt_path text;

-- RLS por hogar en las tablas nuevas.
do $$
declare t text;
begin
  foreach t in array array['event_guests', 'event_items', 'event_attachments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Household isolation" on %I', t);
    execute format(
      'create policy "Household isolation" on %I for all to authenticated using (household_id = current_household_id()) with check (household_id = current_household_id())',
      t
    );
  end loop;
end $$;
