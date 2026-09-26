"use client";

import { useState, type FormEvent } from "react";
import { ChefHat, Clock, Plus, Trash2, Users } from "lucide-react";
import type { Ingredient, Recipe } from "@/lib/types";
import { deleteRecipe, saveRecipe } from "@/app/actions/recipes";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { UNITS, formatQty } from "@/lib/kitchen";
import { EmptyAction } from "@/components/ui/EmptyAction";

const EMPTY: Ingredient = { name: "", quantity: null, unit: "u" };

export function RecipesList({ recipes }: { recipes: Recipe[] }) {
  const sheet = useSheet<Recipe>();
  const [ings, setIngs] = useState<Ingredient[]>([EMPTY]);
  const [q, setQ] = useState("");

  function openNew() {
    setIngs([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }]);
    sheet.openNew();
  }
  function openEdit(r: Recipe) {
    setIngs(r.ingredients.length ? r.ingredients.map((i) => ({ ...i })) : [{ ...EMPTY }]);
    sheet.openEdit(r);
  }
  function setIng(i: number, patch: Partial<Ingredient>) {
    setIngs((list) => list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveRecipe({
        id: sheet.editing?.id,
        title: f.str("title"),
        portions: f.str("portions"),
        ingredients: ings,
        steps: f.opt("steps"),
        prep_minutes: f.opt("prep_minutes"),
        tags: f.str("tags").split(","),
      })
    );
  }

  const filtered = recipes.filter(
    (r) => r.title.toLowerCase().includes(q.toLowerCase()) || r.tags.some((t) => t.includes(q.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta…" aria-label="Buscar" />

      {recipes.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-accent text-2xl text-ink-faint">Cargá las recetas de siempre con sus ingredientes. Después, planificar y comprar es un toque.</p>
          <EmptyAction label="Cargar una receta" onClick={openNew} />
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {filtered.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => openEdit(r)} className="lb-card flex w-full items-center gap-3 !p-3 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: "#0EA5A5" }}>
                <ChefHat size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-item font-medium text-ink">{r.title}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-meta text-ink-faint">
                  <span className="inline-flex items-center gap-1">
                    <Users size={11} /> {r.portions}
                  </span>
                  {r.prep_minutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} /> {r.prep_minutes} min
                    </span>
                  )}
                  <span>{r.ingredients.length} ingredientes</span>
                  {r.tags.length > 0 && <span>· {r.tags.join(", ")}</span>}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Fab onClick={openNew} label="Nueva receta" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar receta" : "Nueva receta"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input name="title" required autoFocus defaultValue={sheet.editing?.title ?? ""} placeholder="Milanesas con puré" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Porciones (rinde para)">
              <Input name="portions" type="number" inputMode="numeric" min="1" required defaultValue={sheet.editing?.portions ?? 4} />
            </Field>
            <Field label="Minutos (opcional)">
              <Input name="prep_minutes" type="number" inputMode="numeric" min="0" defaultValue={sheet.editing?.prep_minutes ?? ""} />
            </Field>
          </div>

          <Field group label="Ingredientes" hint="Cantidad para las porciones de arriba. Se escalan solas al planificar.">
            <div className="flex flex-col gap-2">
              {ings.map((ing, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_72px_36px] items-center gap-2">
                  <Input value={ing.name} onChange={(e) => setIng(i, { name: e.target.value })} placeholder="Carne" aria-label="Ingrediente" />
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={ing.quantity ?? ""}
                    onChange={(e) => setIng(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="1"
                    aria-label="Cantidad"
                    className="!px-2"
                  />
                  <Select value={ing.unit} onChange={(e) => setIng(i, { unit: e.target.value })} aria-label="Unidad" className="!px-2">
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    aria-label="Quitar"
                    onClick={() => setIngs((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l))}
                    className="flex h-9 w-9 items-center justify-center text-ink-ghost"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setIngs((l) => [...l, { ...EMPTY }])}
                className="flex min-h-10 items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed border-line text-sm font-semibold text-ink-faint"
              >
                <Plus size={14} /> Otro ingrediente
              </button>
            </div>
          </Field>

          <Field label="Cómo se hace (opcional)">
            <Textarea name="steps" rows={4} defaultValue={sheet.editing?.steps ?? ""} />
          </Field>
          <Field label="Etiquetas (opcional)" hint="Separadas por coma: rápido, chicos, sin gluten…">
            <Input name="tags" defaultValue={sheet.editing?.tags.join(", ") ?? ""} />
          </Field>
          {sheet.editing && sheet.editing.ingredients.length > 0 && (
            <p className="text-meta text-ink-faint">
              Actual: {sheet.editing.ingredients.map((i) => `${i.name}${i.quantity ? ` ${formatQty(i.quantity, i.unit)}` : ""}`).join(" · ")}
            </p>
          )}
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} onDelete={sheet.editing ? () => sheet.remove(() => deleteRecipe(sheet.editing!.id), `la receta “${sheet.editing!.title}”`) : undefined} />
        </form>
      </BottomSheet>
    </div>
  );
}
