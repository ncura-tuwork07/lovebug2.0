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
