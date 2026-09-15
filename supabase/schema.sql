-- Lovebug — esquema completo (v2, datos reales)
-- Idempotente: se puede correr varias veces en el SQL Editor de Supabase.

create extension if not exists "pgcrypto";

-- ───────────────────────── Familia ─────────────────────────
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('parent', 'child')),
  color text not null default '#FFB347',
  birthday date,
  notes text,
  created_at timestamptz not null default now()
);
alter table family_members add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table family_members add column if not exists sort_order int not null default 0;
create unique index if not exists family_members_user_id_key on family_members(user_id) where user_id is not null;

-- Naza y Jazmín, vinculados a sus cuentas de login
insert into family_members (name, role, color, user_id, sort_order)
values
  ('Naza',   'parent', '#3B82F6', '5f2008a4-7398-495f-8c4f-abc52ebcaecb', 0),
  ('Jazmín', 'parent', '#EC4899', 'dd52800c-9c68-48ff-902b-f5ebd4b7b70a', 1)
on conflict (user_id) where user_id is not null do nothing;

-- ───────────────────────── Calendario ─────────────────────────
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'familia',
  member_id uuid references family_members(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_at timestamptz not null default now()
);
alter table calendar_events add column if not exists all_day boolean not null default false;
alter table calendar_events drop constraint if exists calendar_events_category_check;
alter table calendar_events add constraint calendar_events_category_check
  check (category in ('colegio', 'salud', 'actividades', 'social', 'casa', 'plata', 'familia', 'trabajo'));

-- ───────────────────────── Logística ─────────────────────────
create table if not exists logistics_trips (
  id uuid primary key default gen_random_uuid(),
  destination text not null,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table logistics_trips drop column if exists pickup_time;
alter table logistics_trips drop column if exists driver;
alter table logistics_trips add column if not exists trip_date date not null default current_date;
alter table logistics_trips add column if not exists member_id uuid references family_members(id) on delete set null;
alter table logistics_trips add column if not exists driver_id uuid references family_members(id) on delete set null;
alter table logistics_trips add column if not exists origin text;
alter table logistics_trips add column if not exists departure_time time;
alter table logistics_trips add column if not exists arrival_time time;
alter table logistics_trips add column if not exists transport text not null default 'auto';
alter table logistics_trips add column if not exists meet_with text;
alter table logistics_trips drop constraint if exists logistics_trips_transport_check;
alter table logistics_trips add constraint logistics_trips_transport_check
  check (transport in ('auto', 'colectivo', 'caminando', 'bici', 'moto', 'otro'));

-- ───────────────────────── Tareas del día ─────────────────────────
create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assigned_to uuid references family_members(id) on delete set null,
  due_date date not null default current_date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table daily_tasks add column if not exists notes text;

-- ───────────────────────── Metas y proyectos ─────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  horizon text not null default 'week',
  status text not null default 'todo',
  due_date date,
  created_at timestamptz not null default now()
);
alter table projects add column if not exists progress int not null default 0;
alter table projects add column if not exists member_id uuid references family_members(id) on delete set null;
alter table projects drop constraint if exists projects_horizon_check;
alter table projects add constraint projects_horizon_check check (horizon in ('today', 'week', 'month', 'quarter'));
alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check check (status in ('todo', 'in_progress', 'done'));
alter table projects drop constraint if exists projects_progress_check;
alter table projects add constraint projects_progress_check check (progress between 0 and 100);

-- ───────────────────────── Finanzas ─────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12, 2) not null,
  category text not null default 'otro',
  paid_by uuid references family_members(id) on delete set null,
  spent_at date not null default current_date,
  is_fixed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in ('super', 'casa', 'chicos', 'auto', 'salud', 'ocio', 'ropa', 'servicios', 'alquiler', 'educacion', 'otro'));

create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12, 2) not null,
  source text not null default 'sueldo' check (source in ('sueldo', 'freelance', 'proyecto', 'anses', 'otro')),
  member_id uuid references family_members(id) on delete set null,
  received_at date not null default current_date,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);
alter table savings_goals add column if not exists member_id uuid references family_members(id) on delete set null;

-- ───────────────────────── Inspiración diaria (caché) ─────────────────────────
create table if not exists daily_content (
  day date primary key,
  verse_text text,
  verse_reference text,
  reflection text,
  prayer_title text,
  prayer_text text,
  saint text,
  horoscope jsonb,
  source text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Seguridad (RLS) ─────────────────────────
-- App privada de a dos: cualquier usuario autenticado del proyecto tiene acceso total.
do $$
declare t text;
begin
  foreach t in array array[
    'family_members', 'calendar_events', 'logistics_trips', 'daily_tasks',
    'projects', 'expenses', 'incomes', 'savings_goals', 'daily_content'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Authenticated full access" on %I', t);
    execute format(
      'create policy "Authenticated full access" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
