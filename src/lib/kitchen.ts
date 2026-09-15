import type { Ingredient, PantryItem, Recipe } from "@/lib/types";

export const UNITS = ["u", "kg", "g", "l", "ml", "paq", "lata", "atado", "docena"] as const;

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, ""); // "papas" ≈ "papa"
}

export function formatQty(q: number | null, unit: string): string {
  if (q == null) return "";
  const n = Math.round(q * 100) / 100;
  const s = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  return unit === "u" ? `${s} u` : `${s} ${unit}`;
}

// Escala los ingredientes de una receta a la cantidad de porciones pedida.
const WHOLE_UNITS = new Set(["u", "paq", "lata", "atado", "docena"]);

export function scaleIngredients(recipe: Recipe, portions: number): Ingredient[] {
  const factor = recipe.portions > 0 ? portions / recipe.portions : 1;
  return recipe.ingredients.map((i) => {
    if (i.quantity == null) return { ...i };
    const scaled = i.quantity * factor;
    // Las unidades enteras (huevos, latas, paquetes) se redondean para arriba.
    return { ...i, quantity: WHOLE_UNITS.has(i.unit) ? Math.ceil(scaled - 1e-9) : Math.round(scaled * 100) / 100 };
  });
}

// Suma ingredientes repetidos (misma unidad) de varias recetas.
export function mergeIngredients(lists: Ingredient[][]): Ingredient[] {
  const map = new Map<string, Ingredient>();
  for (const list of lists) {
    for (const i of list) {
      const key = `${normalizeName(i.name)}|${i.unit}`;
      const prev = map.get(key);
      if (prev) {
        prev.quantity = prev.quantity == null || i.quantity == null ? null : prev.quantity + i.quantity;
      } else {
        map.set(key, { ...i });
      }
    }
  }
  return [...map.values()];
}

export type PantryCheck = { ingredient: Ingredient; have: PantryItem | null; missing: number | null };

// Compara contra la despensa: qué ya tienen y cuánto falta comprar.
export function checkPantry(ingredients: Ingredient[], pantry: PantryItem[]): PantryCheck[] {
  const byName = new Map(pantry.map((p) => [normalizeName(p.name), p]));
  return ingredients.map((ingredient) => {
    const have = byName.get(normalizeName(ingredient.name)) ?? null;
    if (!have || Number(have.quantity) <= 0) return { ingredient, have: null, missing: ingredient.quantity };
    if (ingredient.quantity == null || have.unit !== ingredient.unit) return { ingredient, have, missing: null };
    const missing = Math.max(0, ingredient.quantity - Number(have.quantity));
    return { ingredient, have, missing: Math.round(missing * 100) / 100 };
  });
}

// Texto para la lista de compras: "Papas × 2 kg"
export function toShoppingLine(c: PantryCheck): { name: string; quantity: string | null } | null {
  if (c.have && c.missing === 0) return null; // ya tienen suficiente
  const qty = c.missing ?? c.ingredient.quantity;
  return { name: c.ingredient.name, quantity: qty == null ? null : formatQty(qty, c.ingredient.unit) };
}

export function parseIngredientLines(text: string): Ingredient[] {
  // "2 kg papas" | "papas 2 kg" | "papas" | "6 huevos"
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/) || line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?$/);
      if (!m) return { name: line, quantity: null, unit: "u" };
      const leading = /^\d/.test(line);
      const qty = Number((leading ? m[1] : m[2]).replace(",", "."));
      const unitRaw = (leading ? m[2] : m[3])?.toLowerCase();
      const name = (leading ? m[3] : m[1]).trim();
      const unit = unitRaw && (UNITS as readonly string[]).includes(unitRaw) ? unitRaw : "u";
      return { name: unitRaw && unit === "u" && unitRaw !== "u" ? `${unitRaw} ${name}` : name, quantity: qty, unit };
    });
}
