"use client";

import { type FormEvent } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import type { Budget, Expense, ExpenseCategory } from "@/lib/types";
import { deleteBudget, saveBudget } from "@/app/actions/budgets";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, Select, SubmitRow } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/labels";

export function BudgetsPanel({ budgets, expenses }: { budgets: Budget[]; expenses: Expense[] }) {
  const sheet = useSheet<Budget>();

  const spentBy = (cat: string) =>
    expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() => saveBudget(f.str("category"), f.str("monthly_limit")));
  }

  const available = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).filter(
    (c) => !budgets.some((b) => b.category === c) || sheet.editing?.category === c
  );

  return (
    <div className="flex flex-col gap-3">
      {budgets.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">
          Poné un tope por categoría (“no más de $X en salidas”) y te avisamos cuando se acerque.
        </p>
      )}
      {budgets.map((b) => {
        const spent = spentBy(b.category);
        const pct = Math.min(100, Math.round((spent / Number(b.monthly_limit)) * 100));
        const over = spent > Number(b.monthly_limit);
        const near = !over && pct >= 80;
        return (
          <button key={b.id} type="button" onClick={() => sheet.openEdit(b)} className="lb-card w-full text-left">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-2 text-item font-medium text-ink">
                {(over || near) && <AlertTriangle size={15} className={over ? "text-danger" : "text-amber"} />}
                {EXPENSE_CATEGORIES[b.category as ExpenseCategory] ?? b.category}
              </span>
              <span className={`font-display text-sm font-bold ${over ? "text-danger" : near ? "text-amber" : "text-success"}`}>
                {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-track">
              <div
                className={`h-full rounded-full ${over ? "bg-danger" : near ? "bg-amber" : "bg-success"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-meta text-ink-faint">
              {formatARS(spent)} de {formatARS(Number(b.monthly_limit))}
              {over ? ` · te pasaste ${formatARS(spent - Number(b.monthly_limit))}` : ` · quedan ${formatARS(Number(b.monthly_limit) - spent)}`}
            </p>
          </button>
        );
      })}

      <button
        type="button"
        onClick={sheet.openNew}
        className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-line text-sm font-semibold text-ink-faint"
      >
        <Plus size={16} /> Agregar tope
      </button>

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar tope" : "Nuevo tope mensual"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Categoría">
            <Select name="category" defaultValue={sheet.editing?.category ?? available[0]} disabled={!!sheet.editing}>
              {available.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORIES[c]}
                </option>
              ))}
            </Select>
            {sheet.editing && <input type="hidden" name="category" value={sheet.editing.category} />}
          </Field>
          <Field label="Tope por mes ($)">
            <Input name="monthly_limit" type="number" inputMode="decimal" step="any" min="1" required autoFocus defaultValue={sheet.editing?.monthly_limit ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} onDelete={sheet.editing ? () => sheet.remove(() => deleteBudget(sheet.editing!.category), "el tope") : undefined} />
        </form>
      </BottomSheet>
    </div>
  );
}
