import type { Member } from "@/lib/types";

// El rol es texto libre; estas son sugerencias para que sea rápido de cargar.
export const ROLE_SUGGESTIONS = [
  "Mamá",
  "Papá",
  "Pareja",
  "Hija",
  "Hijo",
  "Abuela",
  "Abuelo",
  "Hermana",
  "Hermano",
  "Tía",
  "Tío",
  "Amiga",
  "Amigo",
  "Compañera de casa",
  "Compañero de casa",
  "Niñera",
  "Mascota",
];

export const DEFAULT_ROLE = "Adulto/a";

// Adultos: aparecen en finanzas, logística, vencimientos y horóscopo.
export const adults = (members: Member[]) => members.filter((m) => !m.is_child);
// Menores: suman puntos y premios.
export const kids = (members: Member[]) => members.filter((m) => m.is_child);

// Sugerencias para el Círculo (gente fuera del hogar): familiares y amigos.
export const CIRCLE_SUGGESTIONS = [
  "Abuela",
  "Abuelo",
  "Tía",
  "Tío",
  "Prima",
  "Primo",
  "Hermana",
  "Hermano",
  "Amiga",
  "Amigo",
  "Madrina",
  "Padrino",
  "Compañera de trabajo",
  "Compañero de trabajo",
  "Vecina",
  "Vecino",
  "Niñera",
];
