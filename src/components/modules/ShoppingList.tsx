"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import type { Member, ShoppingCategory, ShoppingItem } from "@/lib/types";
import {
  addShoppingItems,
  clearCheckedShopping,
  deleteShoppingItem,
  toggleShoppingItem,
  updateShoppingItem,
} from "@/app/actions/shopping";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, Select, SubmitRow } from "@/components/ui/Field";
import { MemberDot, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { useRealtimeRefresh } from "@/components/useRealtime";

export const SHOPPING_CATEGORIES: Record<ShoppingCategory, string> = {
  almacen: "Almacén",
  frescos: "Frescos",
  limpieza: "Limpieza",
  chicos: "Chicos",
  farmacia: "Farmacia",
  otro: "Otro",
};

export function ShoppingList({
  items,
  members,
  currentMemberId,
}: {
  items: ShoppingItem[];
  members: Member[];
  currentMemberId: string | null;
}) {
  useRealtimeRefresh("shopping_items");
  const router = useRouter();
  const sheet = useSheet<ShoppingItem>();
  const [quick, setQuick] = useState("");
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  async function quickAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const names = quick
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setAdding(true);
    try {
      await addShoppingItems(names.map((name) => ({ name })), currentMemberId);
      setQuick("");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  async function onToggle(item: ShoppingItem) {
    setPending(item.id);
    try {
      await toggleShoppingItem(item.id, !item.checked);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  function onSubmitEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    if (!sheet.editing) return;
    sheet.run(() =>
      updateShoppingItem(sheet.editing!.id, {
        name: f.str("name"),
        quantity: f.opt("quantity"),
        category: f.str("category") as ShoppingCategory,
      })
    );
  }

  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  const grouped = (Object.keys(SHOPPING_CATEGORIES) as ShoppingCategory[])
    .map((c) => ({ c, list: open.filter((i) => i.category === c) }))
    .filter((g) => g.list.length > 0);

  const renderItem = (item: ShoppingItem) => (
    <li key={item.id} className="flex min-h-11 items-center gap-2">
      <button
        type="button"
        aria-label={item.checked ? "Desmarcar" : "Marcar comprado"}
        disabled={pending === item.id}
        onClick={() => onToggle(item)}
        className="flex h-11 w-9 shrink-0 items-center justify-center"
      >
        {item.checked ? <CheckCircle2 size={22} className="text-success" /> : <Circle size={22} className="text-line" />}
      </button>
      <button
        type="button"
        onClick={() => sheet.openEdit(item)}
        className={`flex min-h-11 flex-1 items-center gap-2 text-left text-item ${
          item.checked ? "text-ink-ghost line-through" : "text-ink"
        }`}
      >
        <span>{item.name}</span>
        {item.quantity && <span className="text-meta text-ink-faint">× {item.quantity}</span>}
        <MemberDot member={memberById(members, item.added_by)} size={8} />
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={quickAdd} className="flex gap-2">
        <Input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="Leche, pan, yerba…"
          aria-label="Agregar a la lista"
          enterKeyHint="done"
          autoComplete="off"
        />
        <button type="submit" disabled={adding || !quick.trim()} aria-label="Agregar" className="lb-btn min-h-11 !px-4 disabled:opacity-50">
          <Plus size={20} />
        </button>
      </form>
      <p className="-mt-3 text-meta text-ink-faint">Separá con comas para cargar varios de una.</p>

      {items.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">Lista vacía. Cuando uno agrega algo, el otro lo ve al instante.</p>
      )}

      {grouped.map(({ c, list }) => (
        <section key={c} className="lb-card !py-3">
          <h2 className="text-label mb-1 font-display uppercase tracking-wider text-ink-ghost">
            {SHOPPING_CATEGORIES[c]} · {list.length}
          </h2>
          <ul>{list.map(renderItem)}</ul>
        </section>
      ))}

      {done.length > 0 && (
        <section className="lb-card !py-3 opacity-80">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-label font-display uppercase tracking-wider text-ink-ghost">En el changuito · {done.length}</h2>
            <button
              type="button"
              onClick={async () => {
                await clearCheckedShopping();
                router.refresh();
              }}
              className="flex min-h-9 items-center gap-1 text-xs font-semibold text-ink-faint"
            >
              <Trash2 size={13} /> Vaciar
            </button>
          </div>
          <ul>{done.map(renderItem)}</ul>
        </section>
      )}

      <BottomSheet open={sheet.open} onClose={sheet.close} title="Editar producto">
        <form onSubmit={onSubmitEdit} className="flex flex-col gap-4">
          <Field label="Producto">
            <Input name="name" required defaultValue={sheet.editing?.name ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad (opcional)">
              <Input name="quantity" defaultValue={sheet.editing?.quantity ?? ""} placeholder="2 kg, 6 unidades…" />
            </Field>
            <Field label="Categoría">
              <Select name="category" defaultValue={sheet.editing?.category ?? "otro"}>
                {(Object.keys(SHOPPING_CATEGORIES) as ShoppingCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {SHOPPING_CATEGORIES[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={sheet.editing ? () => sheet.run(() => deleteShoppingItem(sheet.editing!.id)) : undefined}
          />
        </form>
      </BottomSheet>
    </div>
  );
}
