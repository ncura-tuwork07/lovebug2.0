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
