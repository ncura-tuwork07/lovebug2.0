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
