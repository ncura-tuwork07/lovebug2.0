-- Lovebug — base completa desde cero, en un solo paso.
-- Para un proyecto de Supabase nuevo y vacío: es schema.sql + todas las migraciones (003 a 018)
-- en orden, sin el alta de las cuentas viejas. Se pega entero en el SQL Editor y se da Run.
-- Antes: crear las dos cuentas en Authentication → Users (cada una con su contraseña).
-- Se arma juntando esos archivos: si cambia una migración, hay que volver a armarlo.


-- ════════════════ schema.sql ════════════════
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

-- (Las cuentas de Naza y Jaz se vinculan aparte, por email, después de crearlas.)

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


-- ════════════════ migrations/003_familia_completa.sql ════════════════
-- Lovebug — migración 003: compras, menú, vencimientos, fechas, puntos, presupuestos,
-- perfiles con documentos, ubicación y notificaciones push. Idempotente.

-- ───────────────────────── Perfiles ─────────────────────────
alter table family_members add column if not exists nickname text;
alter table family_members add column if not exists photo_url text;
alter table family_members add column if not exists dni text;
alter table family_members add column if not exists phone text;
alter table family_members add column if not exists blood_type text;
alter table family_members add column if not exists allergies text;
alter table family_members add column if not exists school text;
alter table family_members add column if not exists doctor text;
alter table family_members add column if not exists share_location boolean not null default false;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references family_members(id) on delete cascade,
  title text not null,
  kind text not null default 'otro' check (kind in ('dni', 'vacunas', 'ficha_medica', 'colegio', 'seguro', 'otro')),
  file_path text not null,
  mime_type text,
  size_bytes int,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Compras ─────────────────────────
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity text,
  category text not null default 'otro'
    check (category in ('almacen', 'frescos', 'limpieza', 'chicos', 'farmacia', 'otro')),
  checked boolean not null default false,
  checked_at timestamptz,
  added_by uuid references family_members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Menú semanal ─────────────────────────
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  slot text not null check (slot in ('almuerzo', 'cena')),
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (day, slot)
);

-- ───────────────────────── Vencimientos ─────────────────────────
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date date not null,
  category text not null default 'otro'
    check (category in ('seguro', 'servicio', 'impuesto', 'colegio', 'salud', 'auto', 'casa', 'otro')),
  amount numeric(12, 2),
  member_id uuid references family_members(id) on delete set null,
  notify_days_before int not null default 3,
  repeat text not null default 'none' check (repeat in ('none', 'monthly', 'yearly')),
  done boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Fechas importantes ─────────────────────────
create table if not exists important_dates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  month int not null check (month between 1 and 12),
  day int not null check (day between 1 and 31),
  year int,
  kind text not null default 'cumple' check (kind in ('cumple', 'aniversario', 'otro')),
  member_id uuid references family_members(id) on delete set null,
  remind_days_before int not null default 7,
  gift_ideas text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Puntos y recompensas ─────────────────────────
alter table daily_tasks add column if not exists points int not null default 0;

create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members(id) on delete cascade,
  points int not null,
  reason text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cost int not null check (cost > 0),
  emoji text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Presupuestos ─────────────────────────
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Ubicación ─────────────────────────
create table if not exists locations (
  member_id uuid primary key references family_members(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Notificaciones push ─────────────────────────
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists notifications_log (
  key text primary key,
  sent_at timestamptz not null default now()
);

-- ───────────────────────── Realtime ─────────────────────────
do $$ begin
  alter publication supabase_realtime add table shopping_items;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table locations;
exception when duplicate_object then null; end $$;

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;

drop policy if exists "Lovebug authenticated storage" on storage.objects;
create policy "Lovebug authenticated storage" on storage.objects
  for all to authenticated
  using (bucket_id in ('avatars', 'documents'))
  with check (bucket_id in ('avatars', 'documents'));

drop policy if exists "Lovebug public avatars" on storage.objects;
create policy "Lovebug public avatars" on storage.objects
  for select to anon using (bucket_id = 'avatars');

-- ───────────────────────── RLS ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'documents', 'shopping_items', 'meal_plans', 'reminders', 'important_dates',
    'points_ledger', 'rewards', 'budgets', 'locations', 'push_subscriptions', 'notifications_log'
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


-- ════════════════ migrations/004_cocina_eventos.sql ════════════════
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


-- ════════════════ migrations/005_hogares.sql ════════════════
-- Lovebug — migración 005: hogares (multi-familia), registro, invitaciones, admin. Idempotente.
-- Los datos existentes se asignan al hogar "Naza y Jaz". Nada se borra.

-- ───────────────────────── Hogares ─────────────────────────
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table family_members add column if not exists household_id uuid references households(id) on delete cascade;

-- Hogar del usuario logueado (security definer para no chocar con RLS de family_members).
create or replace function current_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from family_members where user_id = auth.uid() and household_id is not null limit 1
$$;
grant execute on function current_household_id() to authenticated, anon;

-- Migración de datos existentes: un hogar para Naza y Jaz.
do $$
declare h uuid;
begin
  if exists (select 1 from family_members where household_id is null) then
    insert into households (name, created_by)
    values ('Naza y Jaz', (select user_id from family_members where name = 'Naza' limit 1))
    returning id into h;
    update family_members set household_id = h where household_id is null;
  end if;
end $$;

-- Columna household_id en todas las tablas de datos, con default al hogar del usuario.
do $$
declare t text; h uuid;
begin
  select id into h from households order by created_at limit 1;
  foreach t in array array[
    'calendar_events', 'logistics_trips', 'daily_tasks', 'projects', 'expenses', 'incomes',
    'savings_goals', 'documents', 'shopping_items', 'meal_plans', 'reminders', 'important_dates',
    'points_ledger', 'rewards', 'budgets', 'locations', 'push_subscriptions', 'pantry_items',
    'recipes', 'family_events'
  ]
  loop
    execute format('alter table %I add column if not exists household_id uuid references households(id) on delete cascade', t);
    if h is not null then
      execute format('update %I set household_id = $1 where household_id is null', t) using h;
    end if;
    execute format('alter table %I alter column household_id set default current_household_id()', t);
    execute format('create index if not exists %I on %I (household_id)', t || '_household_idx', t);
  end loop;
end $$;

alter table family_members alter column household_id set default current_household_id();

-- Unicidades que ahora son por hogar.
drop index if exists pantry_items_name_key;
create unique index if not exists pantry_items_household_name_key on pantry_items (household_id, lower(name));
alter table budgets drop constraint if exists budgets_category_key;
create unique index if not exists budgets_household_category_key on budgets (household_id, category);
alter table meal_plans drop constraint if exists meal_plans_day_slot_key;
create unique index if not exists meal_plans_household_day_slot_key on meal_plans (household_id, day, slot);
drop index if exists family_members_user_id_key;
create unique index if not exists family_members_user_id_key on family_members (user_id) where user_id is not null;

-- Log de notificaciones: la clave ya incluye el hogar desde el código; nada que cambiar.

-- ───────────────────────── Perfiles, uso y admin ─────────────────────────
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  email text,
  last_seen_at timestamptz,
  installed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists usage_events (
  id bigserial primary key,
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_created_idx on usage_events (created_at);

create table if not exists app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
insert into app_admins (user_id)
  select user_id from family_members where user_id is not null and name in ('Naza', 'Jazmín')
on conflict do nothing;

insert into profiles (user_id, household_id, email)
  select u.id, fm.household_id, u.email from auth.users u
  left join family_members fm on fm.user_id = u.id
on conflict (user_id) do update set household_id = excluded.household_id, email = excluded.email;

-- ───────────────────────── Registro e invitaciones (RPC) ─────────────────────────
create or replace function create_household(p_name text, p_member_name text, p_color text default '#3B82F6')
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from family_members where user_id = uid) then raise exception 'Ya pertenecés a un hogar'; end if;
  insert into households (name, created_by) values (trim(p_name), uid) returning id into h;
  insert into family_members (name, role, color, user_id, household_id, sort_order)
    values (trim(p_member_name), 'parent', coalesce(p_color, '#3B82F6'), uid, h, 0);
  insert into profiles (user_id, household_id, email)
    values (uid, h, (select email from auth.users where id = uid))
    on conflict (user_id) do update set household_id = excluded.household_id;
  return h;
end $$;

create or replace function join_household(p_code text, p_member_name text, p_color text default '#EC4899')
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from family_members where user_id = uid) then raise exception 'Ya pertenecés a un hogar'; end if;
  select id into h from households where invite_code = upper(trim(p_code));
  if h is null then raise exception 'Código de invitación inválido'; end if;
  insert into family_members (name, role, color, user_id, household_id, sort_order)
    values (trim(p_member_name), 'parent', coalesce(p_color, '#EC4899'), uid, h,
      (select coalesce(max(sort_order), 0) + 1 from family_members where household_id = h));
  insert into profiles (user_id, household_id, email)
    values (uid, h, (select email from auth.users where id = uid))
    on conflict (user_id) do update set household_id = excluded.household_id;
  return h;
end $$;

create or replace function regenerate_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
begin
  update households set invite_code = code where id = current_household_id();
  return code;
end $$;

-- Datos públicos mínimos de una invitación (nombre del hogar), sin exponer nada más.
create or replace function invite_preview(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select name from households where invite_code = upper(trim(p_code))
$$;

grant execute on function create_household(text, text, text) to authenticated;
grant execute on function join_household(text, text, text) to authenticated;
grant execute on function regenerate_invite_code() to authenticated;
grant execute on function invite_preview(text) to authenticated, anon;

-- ───────────────────────── RLS por hogar ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'family_members', 'calendar_events', 'logistics_trips', 'daily_tasks', 'projects', 'expenses',
    'incomes', 'savings_goals', 'documents', 'shopping_items', 'meal_plans', 'reminders',
    'important_dates', 'points_ledger', 'rewards', 'budgets', 'locations', 'push_subscriptions',
    'pantry_items', 'recipes', 'family_events'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "Authenticated full access" on %I', t);
    execute format('drop policy if exists "Household isolation" on %I', t);
    execute format(
      'create policy "Household isolation" on %I for all to authenticated using (household_id = current_household_id()) with check (household_id = current_household_id())',
      t
    );
  end loop;
end $$;

alter table households enable row level security;
drop policy if exists "Own household" on households;
create policy "Own household" on households for select to authenticated using (id = current_household_id());
drop policy if exists "Own household update" on households;
create policy "Own household update" on households for update to authenticated
  using (id = current_household_id()) with check (id = current_household_id());

alter table profiles enable row level security;
drop policy if exists "Own profile" on profiles;
create policy "Own profile" on profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table usage_events enable row level security;
drop policy if exists "Insert own usage" on usage_events;
create policy "Insert own usage" on usage_events for insert to authenticated with check (user_id = auth.uid());

alter table app_admins enable row level security; -- sin políticas: solo service role

-- daily_content es global (mismo evangelio para todos); cualquier usuario puede leer y cachear.
alter table daily_content enable row level security;
drop policy if exists "Authenticated full access" on daily_content;
drop policy if exists "Daily content shared" on daily_content;
create policy "Daily content shared" on daily_content for all to authenticated using (true) with check (true);

alter table notifications_log enable row level security;
drop policy if exists "Authenticated full access" on notifications_log;
-- sin políticas: solo service role (cron)

-- Storage: cada hogar solo ve su carpeta (objetos guardados en <household_id>/<member_id>/...)
drop policy if exists "Lovebug authenticated storage" on storage.objects;
create policy "Lovebug household storage" on storage.objects
  for all to authenticated
  using (bucket_id in ('avatars', 'documents') and (storage.foldername(name))[1] = current_household_id()::text)
  with check (bucket_id in ('avatars', 'documents') and (storage.foldername(name))[1] = current_household_id()::text);


-- ════════════════ migrations/006_roles_abiertos.sql ════════════════
-- Lovebug — migración 006: roles abiertos. Un hogar puede ser una familia, una pareja,
-- amigos o compañeros de casa: el rol es texto libre ("Mamá", "Abuela", "Amigo", …)
-- y "is_child" marca a los menores (puntos, sin finanzas ni horóscopo). Idempotente.

alter table family_members drop constraint if exists family_members_role_check;
alter table family_members add column if not exists is_child boolean not null default false;

update family_members set is_child = true where role = 'child' and is_child = false;
update family_members set role = 'Papá' where role = 'parent' and name = 'Naza';
update family_members set role = 'Mamá' where role = 'parent' and name = 'Jazmín';
update family_members set role = 'Hija' where role = 'child' and name = 'Juanita';
update family_members set role = 'Adulto/a' where role = 'parent';
update family_members set role = 'Hijo/a' where role = 'child';

-- Las RPC de alta ahora piden el rol (texto libre).
create or replace function create_household(p_name text, p_member_name text, p_color text default '#3B82F6', p_role text default 'Adulto/a')
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from family_members where user_id = uid) then raise exception 'Ya pertenecés a un hogar'; end if;
  insert into households (name, created_by) values (trim(p_name), uid) returning id into h;
  insert into family_members (name, role, color, user_id, household_id, sort_order)
    values (trim(p_member_name), coalesce(nullif(trim(p_role), ''), 'Adulto/a'), coalesce(p_color, '#3B82F6'), uid, h, 0);
  insert into profiles (user_id, household_id, email)
    values (uid, h, (select email from auth.users where id = uid))
    on conflict (user_id) do update set household_id = excluded.household_id;
  return h;
end $$;

create or replace function join_household(p_code text, p_member_name text, p_color text default '#EC4899', p_role text default 'Adulto/a')
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from family_members where user_id = uid) then raise exception 'Ya pertenecés a un hogar'; end if;
  select id into h from households where invite_code = upper(trim(p_code));
  if h is null then raise exception 'Código de invitación inválido'; end if;
  insert into family_members (name, role, color, user_id, household_id, sort_order)
    values (trim(p_member_name), coalesce(nullif(trim(p_role), ''), 'Adulto/a'), coalesce(p_color, '#EC4899'), uid, h,
      (select coalesce(max(sort_order), 0) + 1 from family_members where household_id = h));
  insert into profiles (user_id, household_id, email)
    values (uid, h, (select email from auth.users where id = uid))
    on conflict (user_id) do update set household_id = excluded.household_id;
  return h;
end $$;

drop function if exists create_household(text, text, text);
drop function if exists join_household(text, text, text);
grant execute on function create_household(text, text, text, text) to authenticated;
grant execute on function join_household(text, text, text, text) to authenticated;


-- ════════════════ migrations/007_usage_default.sql ════════════════
-- Lovebug — migración 007: usage_events toma el hogar del usuario por defecto (métricas por hogar).
alter table usage_events alter column household_id set default current_household_id();
update usage_events e set household_id = p.household_id
  from profiles p where p.user_id = e.user_id and e.household_id is null;


-- ════════════════ migrations/008_eventos_completos.sql ════════════════
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


-- ════════════════ migrations/009_religiones_media_huella.sql ════════════════
-- Lovebug — migración 009: pedidos de tradición ("mi religión no está"), media en eventos
-- (fotos, videos, audios) y llaves de acceso con huella (passkeys). Idempotente.

-- ───────────────── Pedidos de tradición / features ─────────────────
-- Cuando alguien elige "Otra", guardamos qué religión le hubiera gustado ver.
create table if not exists tradition_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete set null default current_household_id(),
  user_id uuid references auth.users(id) on delete set null,
  label text not null,              -- lo que escribió: "musulmana", "budista", …
  note text,                        -- comentario opcional
  status text not null default 'nuevo' check (status in ('nuevo', 'en_curso', 'listo', 'descartado')),
  created_at timestamptz not null default now()
);
create index if not exists tradition_requests_created_idx on tradition_requests (created_at desc);

alter table tradition_requests enable row level security;
drop policy if exists "Insert own request" on tradition_requests;
create policy "Insert own request" on tradition_requests for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Read own request" on tradition_requests;
create policy "Read own request" on tradition_requests for select to authenticated using (user_id = auth.uid());

-- ───────────────── Media de eventos ─────────────────
-- Antes solo 'foto' y 'ticket'; ahora también video y audio (un saludo, la canción del cumple).
alter table event_attachments drop constraint if exists event_attachments_kind_check;
alter table event_attachments add constraint event_attachments_kind_check
  check (kind in ('foto', 'video', 'audio', 'ticket', 'archivo'));
alter table event_attachments add column if not exists size_bytes bigint;
alter table event_attachments add column if not exists duration_seconds int;

-- ───────────────── Passkeys (entrar con huella / cara / PIN del celu) ─────────────────
create table if not exists user_passkeys (
  id text primary key,                       -- credential id (base64url)
  user_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,                  -- clave pública (base64url)
  counter bigint not null default 0,
  transports text[],
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists user_passkeys_user_idx on user_passkeys (user_id);

alter table user_passkeys enable row level security;
drop policy if exists "Own passkeys" on user_passkeys;
create policy "Own passkeys" on user_passkeys for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Desafíos temporales del registro/login con huella (se borran al usarse).
create table if not exists passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
create index if not exists passkey_challenges_created_idx on passkey_challenges (created_at);
alter table passkey_challenges enable row level security; -- sin políticas: solo service role


-- ════════════════ migrations/010_circulo_cuentas_borrador.sql ════════════════
-- Lovebug — migración 010: Círculo (familiares y amigos fuera del hogar, con cumpleaños y
-- sugerencias para eventos), cuentas recurrentes con estado mensual (activa/pausada/pagada) y
-- modo borrador en Finanzas (proyectar meses futuros sin que cuenten como real). Idempotente.

-- ───────────────── Círculo: gente que no vive en el hogar ─────────────────
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  name text not null,
  relationship text,              -- "Tía", "Amigo", "Compañera de trabajo"…, texto libre
  photo_url text,
  birthday date,
  phone text,
  email text,
  notes text,                     -- alergias, ideas de regalo, lo que haga falta
  is_child boolean not null default false,
  archived_at timestamptz,        -- se saca del círculo sin romper eventos pasados que lo referencian
  created_at timestamptz not null default now()
);
create index if not exists contacts_household_idx on contacts (household_id);
create index if not exists contacts_household_name_idx on contacts (household_id, lower(name));

alter table contacts enable row level security;
drop policy if exists "Household isolation" on contacts;
create policy "Household isolation" on contacts for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());

-- Un invitado de evento puede ser alguien del círculo (se recuerda) sin serlo (solo para ese evento).
alter table event_guests add column if not exists contact_id uuid references contacts(id) on delete set null;

-- ───────────────── Cuentas recurrentes: estado por mes (activa/pausada/pagada) ─────────────────
-- Reutiliza "reminders" (repeat = 'monthly') como la plantilla; esta tabla guarda, por mes calendario,
-- si esa cuenta se pagó, se pausó (no se paga este mes pero sigue el que viene) o quedó pendiente.
create table if not exists bill_cycles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  month date not null,            -- primer día del mes, ej. 2026-10-01
  status text not null default 'pendiente' check (status in ('pendiente', 'pausada', 'pagada')),
  amount numeric(12, 2),          -- monto real si difirió del estimado en el vencimiento
  expense_id uuid references expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reminder_id, month)
);
create index if not exists bill_cycles_household_idx on bill_cycles (household_id);
create index if not exists bill_cycles_month_idx on bill_cycles (month);

alter table bill_cycles enable row level security;
drop policy if exists "Household isolation" on bill_cycles;
create policy "Household isolation" on bill_cycles for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());

-- ───────────────── Modo borrador en Finanzas (planear meses futuros como hipótesis) ─────────────────
alter table expenses add column if not exists is_draft boolean not null default false;
alter table incomes add column if not exists is_draft boolean not null default false;


-- ════════════════ migrations/011_cuentas_con_fin.sql ════════════════
-- Lovebug — migración 011: cuentas recurrentes con fecha de fin opcional. Ej. un alquiler que
-- se paga todos los meses "hasta junio del año que viene": después de esa fecha deja de
-- aparecer solo en Vencimientos y en Cuentas de Finanzas, sin tener que borrarlo a mano. Idempotente.

alter table reminders add column if not exists repeat_until date;


-- ════════════════ migrations/012_division_de_gastos.sql ════════════════
-- Lovebug — migración 012: dividir los gastos de un evento entre los que participaron.
-- Partes iguales o a mano, con estado de pago por persona (para marcar "ya me pagó" aunque
-- haya sido en efectivo o por fuera de la app) y un link público de solo lectura para que
-- alguien sin cuenta vea cuánto tiene que pagar y a qué alias/link mandarlo. Idempotente.

create table if not exists event_splits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  event_id uuid not null references family_events(id) on delete cascade,
  method text not null default 'equal' check (method in ('equal', 'manual')),
  payer_member_id uuid references family_members(id) on delete set null,
  payment_info text, -- alias, CBU o link de pago (Mercado Pago, etc.), texto libre
  share_token uuid not null default gen_random_uuid(), -- para el link público de solo lectura
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);
create unique index if not exists event_splits_share_token_key on event_splits (share_token);
create index if not exists event_splits_household_idx on event_splits (household_id);

alter table event_splits enable row level security;
drop policy if exists "Household isolation" on event_splits;
create policy "Household isolation" on event_splits for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());

create table if not exists event_split_shares (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade default current_household_id(),
  event_split_id uuid not null references event_splits(id) on delete cascade,
  guest_id uuid not null references event_guests(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado')),
  paid_note text, -- "efectivo", "transferencia", lo que aclare cómo llegó
  income_id uuid references incomes(id) on delete set null, -- el reintegro que se cargó en Finanzas
  created_at timestamptz not null default now(),
  unique (event_split_id, guest_id)
);
create index if not exists event_split_shares_split_idx on event_split_shares (event_split_id);
create index if not exists event_split_shares_household_idx on event_split_shares (household_id);

alter table event_split_shares enable row level security;
drop policy if exists "Household isolation" on event_split_shares;
create policy "Household isolation" on event_split_shares for all to authenticated
  using (household_id = current_household_id()) with check (household_id = current_household_id());

-- "Reintegro": cuando alguien te devuelve su parte, se carga como este tipo de ingreso.
alter table incomes drop constraint if exists incomes_source_check;
alter table incomes add constraint incomes_source_check
  check (source in ('sueldo', 'freelance', 'proyecto', 'anses', 'reintegro', 'otro'));


-- ════════════════ migrations/014_plano_de_la_casa.sql ════════════════
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


-- ════════════════ migrations/015_donde_estas.sql ════════════════
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


-- ════════════════ migrations/016_solo_nuestro_hogar.sql ════════════════
-- Lovebug — migración 016: Lovebug es solo de Naza y Jaz.
-- Ya no se crean hogares nuevos ni se suma gente con un código de invitación. Se borran las
-- funciones que lo permitían: aunque alguien consiguiera crearse una cuenta, no podría armarse un
-- hogar ni meterse en el de ustedes (y sin hogar, la app le cierra la sesión).
-- No toca ningún dato: los hogares, integrantes y todo lo cargado quedan igual.

drop function if exists create_household(text, text, text);
drop function if exists create_household(text, text, text, text);
drop function if exists join_household(text, text, text);
drop function if exists join_household(text, text, text, text);
drop function if exists regenerate_invite_code();


-- ════════════════ migrations/017_detalle_de_gastos.sql ════════════════
-- Lovebug — migración 017: cada gasto e ingreso con su detalle.
-- Gastos: si ya se pagó o está pendiente, con qué se pagó (efectivo, transferencia…) y un detalle
-- libre. Ingresos: si ya se cobró o falta cobrar, y un detalle. Categorías nuevas: mascotas e
-- impuestos. Todo lo que ya estaba cargado queda como pagado / cobrado.

alter table expenses add column if not exists status text not null default 'pagado';
alter table expenses drop constraint if exists expenses_status_check;
alter table expenses add constraint expenses_status_check check (status in ('pagado', 'pendiente'));

alter table expenses add column if not exists payment_method text;
alter table expenses drop constraint if exists expenses_payment_method_check;
alter table expenses add constraint expenses_payment_method_check
  check (payment_method is null or payment_method in ('efectivo', 'transferencia', 'debito', 'credito', 'mercadopago', 'otro'));

alter table expenses add column if not exists notes text;

alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in ('super', 'casa', 'chicos', 'auto', 'salud', 'ocio', 'ropa', 'servicios', 'alquiler', 'educacion', 'mascotas', 'impuestos', 'otro'));

alter table incomes add column if not exists status text not null default 'cobrado';
alter table incomes drop constraint if exists incomes_status_check;
alter table incomes add constraint incomes_status_check check (status in ('cobrado', 'por_cobrar'));

alter table incomes add column if not exists notes text;


-- ════════════════ migrations/018_deudas.sql ════════════════
-- Lovebug — migración 018: categoría "Deudas" para los gastos (lo que se devuelve cada mes a alguien).
alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in ('super', 'casa', 'chicos', 'auto', 'salud', 'ocio', 'ropa', 'servicios', 'alquiler', 'educacion', 'mascotas', 'impuestos', 'deudas', 'otro'));
