"use client";

import { type FormEvent } from "react";
import { CheckCircle2, Circle, PartyPopper, ShoppingCart, Trash2 } from "lucide-react";
import type { EventItem, EventItemCategory, FamilyEvent } from "@/lib/types";
import { deleteEventItem, saveEventItem, sendEventItemsToShopping, toggleEventItem } from "@/app/actions/familyEvents";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS } from "@/lib/format";
import { EVENT_ITEM_CATEGORIES } from "@/lib/events";
import { AddButton, SectionTitle, useRun } from "./shared";

const ORDER: EventItemCategory[] = ["bebidas", "comida", "decoracion", "vajilla", "otro"];

export function EventExtras({ event, items, currentMemberId }: { event: FamilyEvent; items: EventItem[]; currentMemberId: string | null }) {
  const sheet = useSheet<EventItem>();
  const { busy, msg, run } = useRun();
  const estimated = items.reduce((s, i) => s + Number(i.estimated_cost ?? 0), 0);
  const pending = items.filter((i) => !i.done).length;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveEventItem(event.id, {
        id: sheet.editing?.id,
        category: f.str("category") as EventItemCategory,
        name: f.str("name"),
        quantity: f.opt("quantity"),
        store: f.opt("store"),
        estimated_cost: f.opt("estimated_cost"),
        notes: f.opt("notes"),
      })
    );
  }

  return (
    <section className="lb-card">
      <SectionTitle icon={<PartyPopper size={16} />} color="#FF9F43" action={<AddButton onClick={sheet.openNew} label="Ítem" />}>
        Bebidas, deco y demás
      </SectionTitle>
      {items.length === 0 && (
        <p className="text-body text-ink-faint">Todo lo que no sale de una receta: gaseosas, globos, velitas, vasos, la piñata. Con dónde comprarlo y cuánto va a salir.</p>
      )}
      {ORDER.filter((c) => items.some((i) => i.category === c)).map((cat) => (
        <div key={cat} className="mt-2">
          <p className="text-label font-bold uppercase tracking-wider text-ink-ghost">{EVENT_ITEM_CATEGORIES[cat]}</p>
          <ul>
            {items
              .filter((i) => i.category === cat)
              .map((i) => (
                <li key={i.id} className="flex min-h-10 items-center gap-2">
                  <button type="button" aria-label="Marcar" onClick={() => run(i.id, () => toggleEventItem(event.id, i.id, !i.done))} className="flex h-10 w-8 items-center justify-center">
                    {i.done ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-line" />}
                  </button>
                  <button type="button" onClick={() => sheet.openEdit(i)} className="min-w-0 flex-1 text-left">
                    <span className={`block text-item ${i.done ? "text-ink-ghost line-through" : "text-ink"}`}>
                      {i.name}
                      {i.quantity && <span className="text-meta text-ink-faint"> × {i.quantity}</span>}
                    </span>
                    {(i.store || i.estimated_cost || i.notes) && (
                      <span className="block truncate text-meta text-ink-faint">
                        {[i.store, i.estimated_cost ? formatARS(Number(i.estimated_cost)) : null, i.notes].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                  <button type="button" aria-label="Quitar" onClick={() => run(`del-${i.id}`, () => deleteEventItem(event.id, i.id))} className="flex h-9 w-9 items-center justify-center text-ink-ghost">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {estimated > 0 && <span className="text-sm text-ink-soft">Estimado: <span className="font-semibold text-ink">{formatARS(estimated)}</span></span>}
          <button
            type="button"
            disabled={busy === "send" || pending === 0}
            onClick={() => run("send", () => sendEventItemsToShopping(event.id, currentMemberId), "{n} ítems mandados a Compras")}
            className="lb-btn ml-auto min-h-10 !py-2 text-sm disabled:opacity-50"
          >
            <ShoppingCart size={15} className="mr-1 inline" /> Mandar a Compras
          </button>
        </div>
      )}
      {msg && <p className="mt-1 text-sm text-ink-soft">{msg}</p>}

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar ítem" : "Qué más hace falta"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Field label="Qué">
              <Input name="name" required autoFocus placeholder="Gaseosas, globos, velitas…" defaultValue={sheet.editing?.name ?? ""} />
            </Field>
            <Field label="Rubro">
              <Select name="category" defaultValue={sheet.editing?.category ?? "bebidas"}>
                {ORDER.map((c) => (
                  <option key={c} value={c}>
                    {EVENT_ITEM_CATEGORIES[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad">
              <Input name="quantity" placeholder="6 botellas, 30 u" defaultValue={sheet.editing?.quantity ?? ""} />
            </Field>
            <Field label="Costo estimado ($)">
              <Input name="estimated_cost" type="number" inputMode="decimal" step="any" min="0" defaultValue={sheet.editing?.estimated_cost ?? ""} />
            </Field>
          </div>
          <Field label="Dónde comprarlo">
            <Input name="store" placeholder="Cotillón de la esquina, Carrefour…" defaultValue={sheet.editing?.store ?? ""} />
          </Field>
          <Field label="Notas">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} submitLabel={sheet.editing ? "Guardar" : "Agregar"} />
        </form>
      </BottomSheet>
    </section>
  );
}
