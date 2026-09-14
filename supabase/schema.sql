-- Lovebug MVP schema
-- Correr esto en el SQL editor de Supabase (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- Miembros de la familia (Nazareno, Jazmín, hijos)
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('parent', 'child')),
  color text not null default '#F4A6C1', -- color identificador en calendario/logística
  birthday date,
  notes text,
  created_at timestamptz not null default now()
);

-- Eventos de calendario (colegio, actividades, actos, turnos)
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'general', -- colegio, salud, familia, trabajo, social...
  member_id uuid references family_members(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

-- Logística del día a día (traslados: quién lleva a quién, a dónde)
create table if not exists logistics_trips (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references family_members(id) on delete cascade,
  destination text not null,
  pickup_time timestamptz not null,
  driver text, -- quién lleva
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tareas del día (la "daily")
create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assigned_to uuid references family_members(id) on delete set null,
  due_date date not null default current_date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Proyectos / metas / objetivos con horizonte de tiempo
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  horizon text not null check (horizon in ('week', 'month', 'quarter')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

-- Gastos (finanzas del día a día)
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12, 2) not null,
  category text not null default 'general', -- comida, casa, chicos, ocio, fijo...
  paid_by uuid references family_members(id) on delete set null,
  spent_at date not null default current_date,
  is_fixed boolean not null default false, -- gasto fijo mensual (alquiler, servicios)
  created_at timestamptz not null default now()
);

-- Objetivos de ahorro (auto, casa, etc.)
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);

-- Habilitar Row Level Security. Como es una app privada de a dos,
-- las políticas permiten acceso a cualquier usuario autenticado del proyecto.
alter table family_members enable row level security;
alter table calendar_events enable row level security;
alter table logistics_trips enable row level security;
alter table daily_tasks enable row level security;
alter table projects enable row level security;
alter table expenses enable row level security;
alter table savings_goals enable row level security;

create policy "Authenticated full access" on family_members for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on calendar_events for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on logistics_trips for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on daily_tasks for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on projects for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on expenses for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on savings_goals for all using (auth.role() = 'authenticated');
