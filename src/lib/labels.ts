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
