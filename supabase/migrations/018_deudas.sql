-- Lovebug — migración 018: categoría "Deudas" para los gastos (lo que se devuelve cada mes a alguien).
alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check
  check (category in ('super', 'casa', 'chicos', 'auto', 'salud', 'ocio', 'ropa', 'servicios', 'alquiler', 'educacion', 'mascotas', 'impuestos', 'deudas', 'otro'));
