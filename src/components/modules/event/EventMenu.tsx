"use client";

import { type FormEvent } from "react";
import { ChefHat, ShoppingCart, Trash2 } from "lucide-react";
import type { EventGuest, FamilyEvent, MenuItem, PantryItem, Recipe } from "@/lib/types";
import { sendEventMenuToShopping, setEventMenu } from "@/app/actions/familyEvents";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, Select, SubmitRow } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { checkPantry, formatQty, mergeIngredients, scaleIngredients } from "@/lib/kitchen";
import { formatPortion, menuItemTotal, menuKey } from "@/lib/events";
import { AddButton, SectionTitle, useRun } from "./shared";

export function EventMenu({
  event,
  guests,
  recipes,
  pantry,
  currentMemberId,
}: {
  event: FamilyEvent;
  guests: EventGuest[];
  recipes: Recipe[];
  pantry: PantryItem[];
  currentMemberId: string | null;
}) {
  const sheet = useSheet<{ item: MenuItem; index: number }>();
  const { busy, msg, run } = useRun();
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const hasGuests = guests.some((g) => g.confirmed);

  const totals = event.menu.map((m, i) => menuItemTotal(m, i, guests, event.guests));
  // Ingredientes de todos los platos con receta, escalados al total calculado, contra la despensa.
  const merged = mergeIngredients(
    event.menu.map((m, i) => (m.recipe_id && byId.has(m.recipe_id) ? scaleIngredients(byId.get(m.recipe_id)!, totals[i]) : []))
  );
  const checks = checkPantry(merged, pantry);
  const missing = checks.filter((c) => !(c.have && c.missing === 0));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    const recipeId = f.opt("recipe_id");
    const recipe = recipeId ? byId.get(recipeId) : null;
    const perAdult = Number(f.opt("per_adult")?.replace(",", ".") ?? 1) || 1;
    const perChildRaw = f.opt("per_child");
    const item: MenuItem = {
      key: sheet.editing ? menuKey(sheet.editing.item, sheet.editing.index) : `m${Date.now().toString(36)}`,
      recipe_id: recipeId,
      title: f.str("title").trim() || recipe?.title || "",
      portions: Math.max(1, Math.round(Number(f.opt("portions")) || event.guests || 1)),
      per_adult: perAdult,
      per_child: perChildRaw ? Number(perChildRaw.replace(",", ".")) : undefined,
    };
    const next = sheet.editing ? event.menu.map((m, i) => (i === sheet.editing!.index ? item : m)) : [...event.menu, item];
    sheet.run(() => setEventMenu(event.id, next));
  }

  return (
    <section className="lb-card">
      <SectionTitle icon={<ChefHat size={16} />} color="#0EA5A5" action={<AddButton onClick={sheet.openNew} label="Plato" />}>
        Menú
      </SectionTitle>
      {event.menu.length === 0 && (
        <p className="text-body text-ink-faint">
          Agregá los platos y cuánto come cada uno (ej. 2 hamburguesas por adulto, 1 por peque). Con receta, se calculan los ingredientes.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {event.menu.map((m, i) => {
          const perAdult = m.per_adult ?? 1;
          const perChild = m.per_child ?? Math.max(0.5, perAdult / 2);
          return (
            <li key={menuKey(m, i)} className="flex min-h-11 items-center gap-2 py-1.5">
              <button type="button" onClick={() => sheet.openEdit({ item: m, index: i })} className="min-w-0 flex-1 text-left">
                <span className="block text-item text-ink">{m.title}</span>
                <span className="block text-meta text-ink-faint">
                  {hasGuests ? `${formatPortion(perAdult)} por adulto · ${formatPortion(perChild)} por peque` : `${m.portions} en total`}
                  {m.recipe_id && byId.has(m.recipe_id) ? " · con receta" : ""}
                </span>
              </button>
              <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-sm font-semibold text-ink">→ {totals[i]}</span>
              <button
                type="button"
                aria-label="Quitar plato"
                onClick={() => run(`menu-${i}`, () => setEventMenu(event.id, event.menu.filter((_, idx) => idx !== i)))}
                className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-ghost"
              >
                <Trash2 size={15} />
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <p className="mt-1 text-sm text-ink-soft">{msg}</p>}

      {merged.length > 0 && (
        <div className="mt-3 rounded-md bg-cream p-3 text-sm">
          <p className="mb-1 font-semibold text-ink">Ingredientes para {hasGuests ? `${guests.filter((g) => g.confirmed).length} invitados` : "el evento"}</p>
          <ul className="mb-2 flex flex-col gap-0.5 text-ink-soft">
            {checks.map((c, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {c.ingredient.name}
                  {c.ingredient.quantity != null && <span className="text-ink-faint"> · {formatQty(c.ingredient.quantity, c.ingredient.unit)}</span>}
                </span>
                <span className={c.have && c.missing === 0 ? "text-success" : "text-coral"}>
                  {c.have && c.missing === 0 ? "ya hay" : c.missing != null && c.have ? `faltan ${formatQty(c.missing, c.ingredient.unit)}` : "comprar"}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy === "send" || missing.length === 0}
            onClick={() => run("send", () => sendEventMenuToShopping(event.id, currentMemberId), "{n} productos mandados a Compras")}
            className="lb-btn min-h-10 !py-2 text-sm disabled:opacity-50"
          >
            <ShoppingCart size={15} className="mr-1 inline" /> Mandar lo que falta a Compras
          </button>
        </div>
      )}

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar plato" : "Agregar plato"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Receta (opcional)" hint="Con receta, cada porción trae sus ingredientes: 1 hamburguesa = pan + medallón + tomate…">
            <Select name="recipe_id" defaultValue={sheet.editing?.item.recipe_id ?? ""}>
              <option value="">Sin receta (solo el nombre)</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre del plato">
            <Input name="title" placeholder="Hamburguesas, empanadas, torta…" defaultValue={sheet.editing?.item.title ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Por adulto">
              <Input name="per_adult" type="number" inputMode="decimal" step="0.5" min="0.5" defaultValue={sheet.editing?.item.per_adult ?? 1} />
            </Field>
            <Field label="Por peque">
              <Input
                name="per_child"
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="la mitad"
                defaultValue={sheet.editing?.item.per_child ?? ""}
              />
            </Field>
          </div>
          {!hasGuests && (
            <Field label="Total si no cargás invitados" hint="Cuando cargues la lista de invitados, el total se calcula solo.">
              <Input name="portions" type="number" inputMode="numeric" min="1" defaultValue={sheet.editing?.item.portions ?? (event.guests || 10)} />
            </Field>
          )}
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} submitLabel={sheet.editing ? "Guardar" : "Agregar"} />
        </form>
      </BottomSheet>
    </section>
  );
}
