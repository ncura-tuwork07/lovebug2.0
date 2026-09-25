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
