"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { MealPlan, PantryItem, Recipe } from "@/lib/types";
import { deleteMeal, saveMeal } from "@/app/actions/meals";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { addDays, formatDay, todayAR } from "@/lib/format";
import { checkPantry, formatQty, parseIngredientLines, scaleIngredients } from "@/lib/kitchen";

type Slot = "almuerzo" | "cena";
type Cell = { day: string; slot: Slot; meal: MealPlan | null };

export function MealPlanner({
  weekStart,
  meals,
  recipes,
  pantry,
  currentMemberId,
}: {
  weekStart: string;
  meals: MealPlan[];
  recipes: Recipe[];
  pantry: PantryItem[];
  currentMemberId: string | null;
}) {
  const sheet = useSheet<Cell>();
  const [recipeId, setRecipeId] = useState("");
  const [portions, setPortions] = useState(4);
  const [extra, setExtra] = useState("");
  const [sendToShopping, setSendToShopping] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const today = todayAR();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const recipe = recipes.find((r) => r.id === recipeId) ?? null;

  // Vista previa: qué falta y qué ya tienen.
  const preview = useMemo(() => {
    const ings = [...(recipe ? scaleIngredients(recipe, portions) : []), ...parseIngredientLines(extra)];
    if (!ings.length) return null;
    const checks = checkPantry(ings, pantry);
    return {
      missing: checks.filter((c) => !(c.have && c.missing === 0)),
      have: checks.filter((c) => c.have && c.missing === 0),
    };
  }, [recipe, portions, extra, pantry]);

  function open(day: string, slot: Slot) {
    const meal = meals.find((m) => m.day === day && m.slot === slot) ?? null;
    setRecipeId(meal?.recipe_id ?? "");
    setPortions(meal?.portions ?? recipes.find((r) => r.id === meal?.recipe_id)?.portions ?? 4);
    setExtra("");
    setSendToShopping(!meal);
    setResult(null);
    sheet.openEdit({ day, slot, meal });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    if (!sheet.editing) return;
    const { day, slot } = sheet.editing;
    sheet.run(async () => {
      const r = await saveMeal({
        day,
        slot,
        title: f.str("title"),
        notes: f.opt("notes"),
        recipe_id: recipeId || null,
        portions,
        extra_ingredients: extra,
        send_to_shopping: sendToShopping,
        added_by: currentMemberId,
      });
      if (r.added || r.skipped) setResult(`${r.added} a Compras${r.skipped ? ` · ${r.skipped} ya en la despensa` : ""}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href={`/menu?w=${addDays(weekStart, -7)}`} aria-label="Semana anterior" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-faint">
          <ChevronLeft size={20} />
        </Link>
        <p className="text-item font-semibold text-ink">
          {formatDay(weekStart, "d MMM")} – {formatDay(addDays(weekStart, 6), "d MMM")}
        </p>
        <Link href={`/menu?w=${addDays(weekStart, 7)}`} aria-label="Semana siguiente" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-faint">
          <ChevronRight size={20} />
        </Link>
      </div>

      {result && <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">Listo: {result}.</p>}

      <ul className="flex flex-col gap-2">
        {days.map((day) => {
          const isToday = day === today;
          return (
            <li key={day} className={`lb-card !p-3 ${isToday ? "ring-2 ring-amber/60" : ""}`}>
              <p className={`mb-2 text-label font-display uppercase tracking-wider ${isToday ? "text-amber" : "text-ink-ghost"}`}>
                {isToday ? "Hoy · " : ""}
                {formatDay(day, "EEEE d")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["almuerzo", "cena"] as Slot[]).map((slot) => {
                  const meal = meals.find((m) => m.day === day && m.slot === slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => open(day, slot)}
                      className={`flex min-h-16 flex-col items-start rounded-md border-[1.5px] px-3 py-2 text-left ${
                        meal ? "border-transparent bg-cream" : "border-dashed border-line"
                      }`}
                    >
                      <span className="text-meta capitalize text-ink-faint">
                        {slot}
                        {meal?.portions ? ` · ${meal.portions} p.` : ""}
                      </span>
                      {meal ? (
                        <span className="text-item font-medium text-ink">{meal.title}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-ink-ghost">
                          <Plus size={14} /> Agregar
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <BottomSheet
        open={sheet.open}
        onClose={sheet.close}
        title={sheet.editing ? `${sheet.editing.slot === "almuerzo" ? "Almuerzo" : "Cena"} · ${formatDay(sheet.editing.day, "EEEE d")}` : ""}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {recipes.length > 0 && (
            <div className="grid grid-cols-[1fr_88px] gap-3">
              <Field label="Receta (opcional)">
                <Select
                  value={recipeId}
                  onChange={(e) => {
                    setRecipeId(e.target.value);
                    const r = recipes.find((x) => x.id === e.target.value);
                    if (r) setPortions(r.portions);
                  }}
                >
                  <option value="">Sin receta</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Comen">
                <Input type="number" inputMode="numeric" min="1" value={portions} onChange={(e) => setPortions(Math.max(1, Number(e.target.value) || 1))} />
              </Field>
            </div>
          )}
          <Field label="Qué comemos">
            <Input name="title" autoFocus={!recipeId} defaultValue={sheet.editing?.meal?.title ?? ""} placeholder={recipe?.title ?? "Milanesas con puré"} />
          </Field>
          <Field label="Ingredientes extra (opcional)" hint="Uno por línea o con coma. Podés poner cantidad: “2 kg papas”.">
            <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} placeholder="Pan, 1 l leche" />
          </Field>

          {preview && (
            <div className="rounded-md bg-cream p-3 text-sm">
              {preview.missing.length > 0 && (
                <p className="text-ink">
                  <span className="font-semibold text-coral">Falta comprar:</span>{" "}
                  {preview.missing.map((c) => `${c.ingredient.name}${c.missing != null ? ` ${formatQty(c.missing, c.ingredient.unit)}` : ""}`).join(", ")}
                </p>
              )}
              {preview.have.length > 0 && (
                <p className="mt-1 text-ink-faint">
                  <span className="font-semibold text-success">Ya tienen:</span> {preview.have.map((c) => c.ingredient.name).join(", ")}
                </p>
              )}
              <label className="mt-2 flex min-h-9 items-center gap-2 text-ink">
                <input type="checkbox" checked={sendToShopping} onChange={(e) => setSendToShopping(e.target.checked)} className="h-5 w-5 accent-coral" />
                Mandar lo que falta a Compras
              </label>
            </div>
          )}

          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={sheet.editing?.meal?.notes ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={sheet.editing?.meal ? () => sheet.remove(() => deleteMeal(sheet.editing!.day, sheet.editing!.slot), `“${sheet.editing!.meal!.title}”`) : undefined}
          />
        </form>
      </BottomSheet>
    </div>
  );
}
