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
