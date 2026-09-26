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

// Antes el rol arrancaba en "Adulto/a" y se confundía con la edad: ese valor viejo se trata como
// "sin rol" (no se muestra y el formulario pide elegir uno de verdad).
export const LEGACY_ROLE = "Adulto/a";
export const FALLBACK_ROLE = "Integrante";
export const shownRole = (role: string | null | undefined) => (role && role !== LEGACY_ROLE ? role : "");

// Con el cumple cargado ya sabemos si es menor de edad; null si la fecha no sirve.
export function isMinor(birthday: string | null | undefined, today: string): boolean | null {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday ?? "");
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!b || !t) return null;
  let age = +t[1] - +b[1];
  if (+t[2] < +b[2] || (+t[2] === +b[2] && +t[3] < +b[3])) age--;
  return age >= 0 && age < 120 ? age < 18 : null;
}

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
