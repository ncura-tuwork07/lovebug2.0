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
  otro: "Otro",
};
