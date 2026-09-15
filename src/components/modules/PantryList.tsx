"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import type { PantryItem, ShoppingCategory } from "@/lib/types";
import { adjustPantry, deletePantryItem, savePantryItem } from "@/app/actions/pantry";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { UNITS, formatQty } from "@/lib/kitchen";
import { SHOPPING_CATEGORIES } from "@/lib/labels";

export function PantryList({ items }: { items: PantryItem[] }) {
  const router = useRouter();
  const sheet = useSheet<PantryItem>();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      savePantryItem({
        id: sheet.editing?.id,
        name: f.str("name"),
        quantity: f.str("quantity"),
        unit: f.str("unit"),
        category: f.str("category") as ShoppingCategory,
        notes: f.opt("notes"),
      })
    );
  }

  async function bump(item: PantryItem, delta: number) {
    setBusy(item.id);
    try {
      await adjustPantry(item.id, delta);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const grouped = (Object.keys(SHOPPING_CATEGORIES) as ShoppingCategory[])
    .map((c) => ({ c, list: filtered.filter((i) => i.category === c) }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la despensa…" aria-label="Buscar" />

      {items.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">
          Vacía. Cargá lo que tienen en casa, o desde Compras tocá “Guardar en despensa” cuando vacíen el changuito.
        </p>
      )}

      {grouped.map(({ c, list }) => (
        <section key={c} className="lb-card !py-3">
          <h2 className="text-label mb-1 font-display uppercase tracking-wider text-ink-ghost">
            {SHOPPING_CATEGORIES[c]} · {list.length}
          </h2>
          <ul className="flex flex-col">
            {list.map((item) => {
              const low = Number(item.quantity) <= 0;
              return (
                <li key={item.id} className="flex min-h-12 items-center gap-2">
                  <button type="button" onClick={() => sheet.openEdit(item)} className="min-w-0 flex-1 py-2 text-left">
                    <p className={`text-item ${low ? "text-ink-ghost" : "text-ink"}`}>{item.name}</p>
                    {item.notes && <p className="text-meta text-ink-faint">{item.notes}</p>}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Restar"
                      disabled={busy === item.id}
                      onClick={() => bump(item, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-line/60 text-ink"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={`w-16 text-center text-sm font-semibold ${low ? "text-danger" : "text-ink"}`}>
                      {low ? "sin stock" : formatQty(Number(item.quantity), item.unit)}
                    </span>
                    <button
                      type="button"
                      aria-label="Sumar"
                      disabled={busy === item.id}
                      onClick={() => bump(item, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-line/60 text-ink"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Fab onClick={sheet.openNew} label="Agregar a la despensa" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar" : "Nuevo en la despensa"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Qué es">
            <Input name="name" required autoFocus defaultValue={sheet.editing?.name ?? ""} placeholder="Arroz, aceite, papel higiénico…" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cantidad">
              <Input name="quantity" type="number" inputMode="decimal" step="any" min="0" defaultValue={sheet.editing?.quantity ?? 1} />
            </Field>
            <Field label="Unidad">
              <Select name="unit" defaultValue={sheet.editing?.unit ?? "u"}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría">
              <Select name="category" defaultValue={sheet.editing?.category ?? "almacen"}>
                {(Object.keys(SHOPPING_CATEGORIES) as ShoppingCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {SHOPPING_CATEGORIES[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} placeholder="Vence en octubre…" />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} onDelete={sheet.editing ? () => sheet.run(() => deletePantryItem(sheet.editing!.id)) : undefined} />
        </form>
      </BottomSheet>
    </div>
  );
}
