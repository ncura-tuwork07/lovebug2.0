-- Lovebug — migración 011: cuentas recurrentes con fecha de fin opcional. Ej. un alquiler que
-- se paga todos los meses "hasta junio del año que viene": después de esa fecha deja de
-- aparecer solo en Vencimientos y en Cuentas de Finanzas, sin tener que borrarlo a mano. Idempotente.

alter table reminders add column if not exists repeat_until date;
