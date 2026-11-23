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
