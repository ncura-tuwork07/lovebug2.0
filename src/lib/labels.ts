import type { ExpenseCategory, IncomeSource } from "@/lib/types";

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  super: "Supermercado",
  casa: "Casa",
  chicos: "Chicos",
  auto: "Auto / nafta",
  salud: "Salud",
  ocio: "Salidas / ocio",
  ropa: "Ropa",
  servicios: "Servicios",
  alquiler: "Alquiler / expensas",
  educacion: "Colegio / educación",
  mascotas: "Mascotas",
  impuestos: "Impuestos / monotributo",
  otro: "Otro",
};

export const PAYMENT_METHODS: Record<import("@/lib/types").PaymentMethod, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Tarjeta de crédito",
  mercadopago: "Mercado Pago",
  otro: "Otro",
};

export const INCOME_SOURCES: Record<IncomeSource, string> = {
  sueldo: "Sueldo",
  freelance: "Freelance / tercerizado",
  proyecto: "Proyecto",
  anses: "ANSES / asignación",
  reintegro: "Reintegro",
  otro: "Otro",
};

export const SHOPPING_CATEGORIES: Record<import("@/lib/types").ShoppingCategory, string> = {
  almacen: "Almacén",
  frescos: "Frescos",
  limpieza: "Limpieza",
  chicos: "Chicos",
  farmacia: "Farmacia",
  otro: "Otro",
};
