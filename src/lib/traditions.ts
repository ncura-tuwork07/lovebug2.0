import type { HouseholdSettings, Tradition } from "@/lib/types";

export const TRADITIONS: { key: Tradition; label: string; desc: string; emoji: string }[] = [
  { key: "catolica", label: "Católica", desc: "Evangelio del día, santo y oración.", emoji: "✝️" },
  { key: "cristiana", label: "Cristiana", desc: "Versículo del día y oración (evangélica, protestante, otras).", emoji: "📖" },
  { key: "judia", label: "Judía", desc: "Enseñanza de la Torá, parashá y velas de Shabat.", emoji: "✡️" },
  { key: "ninguna", label: "Sin religión", desc: "Un pensamiento del día, sin contenido religioso.", emoji: "🌱" },
];

// Resuelve la tradición efectiva (con compatibilidad con el switch viejo "gospel").
export function traditionOf(settings: HouseholdSettings | null | undefined): Tradition | null {
  const insp = settings?.inspiration;
  if (insp?.tradition) return insp.tradition;
  if (insp?.gospel === false) return "ninguna";
  return null; // todavía no eligieron
}
