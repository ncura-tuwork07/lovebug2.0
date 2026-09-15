"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { MealPlan } from "@/lib/types";
import { deleteMeal, saveMeal } from "@/app/actions/meals";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { addDays, formatDay, todayAR } from "@/lib/format";

type Slot = "almuerzo" | "cena";
type Cell = { day: string; slot: Slot; meal: MealPlan | null };

export function MealPlanner({
  weekStart,
  meals,
  currentMemberId,
}: {
  weekStart: string;
  meals: MealPlan[];
  currentMemberId: string | null;
}) {
  const sheet = useSheet<Cell>();
  const [ingredients, setIngredients] = useState("");
  const today = todayAR();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function open(day: string, slot: Slot) {
    setIngredients("");
    sheet.openEdit({ day, slot, meal: meals.find((m) => m.day === day && m.slot === slot) ?? null });
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    if (!sheet.editing) return;
    const { day, slot } = sheet.editing;
    sheet.run(() =>
      saveMeal({
        day,
        slot,
        title: f.str("title"),
        notes: f.opt("notes"),
        ingredients: ingredients.split(/[,\n]/),
        added_by: currentMemberId,
      })
    );
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
                      <span className="text-meta capitalize text-ink-faint">{slot}</span>
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
          <Field label="Qué comemos">
            <Input name="title" required autoFocus defaultValue={sheet.editing?.meal?.title ?? ""} placeholder="Milanesas con puré" />
          </Field>
          <Field label="Ingredientes para la lista de compras (opcional)" hint="Uno por línea o separados por coma. Se agregan a Compras al guardar.">
            <Textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} rows={3} placeholder="Carne, pan rallado, papas" />
          </Field>
          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={sheet.editing?.meal?.notes ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={
              sheet.editing?.meal
                ? () => sheet.run(() => deleteMeal(sheet.editing!.day, sheet.editing!.slot))
                : undefined
            }
          />
        </form>
      </BottomSheet>
    </div>
  );
}
