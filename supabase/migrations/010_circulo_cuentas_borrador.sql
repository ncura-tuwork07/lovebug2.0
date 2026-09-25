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
