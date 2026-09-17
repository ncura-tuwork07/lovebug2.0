-- Lovebug — migración 007: usage_events toma el hogar del usuario por defecto (métricas por hogar).
alter table usage_events alter column household_id set default current_household_id();
update usage_events e set household_id = p.household_id
  from profiles p where p.user_id = e.user_id and e.household_id is null;
