"use client";

import { useState, type FormEvent } from "react";
import { Baby, Check, Home, Trash2, Users } from "lucide-react";
import type { EventGuest, FamilyEvent, Member } from "@/lib/types";
import { addGuestsBulk, addHouseholdAsGuests, deleteGuest, saveGuest } from "@/app/actions/familyEvents";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatPortion, guestPortion, menuKey } from "@/lib/events";
import { AddButton, SectionTitle, useRun } from "./shared";

export function EventGuests({ event, guests, members }: { event: FamilyEvent; guests: EventGuest[]; members: Member[] }) {
  const sheet = useSheet<EventGuest>();
  const { busy, msg, run } = useRun();
  const [bulk, setBulk] = useState("");
  const confirmed = guests.filter((g) => g.confirmed);
  const kids = confirmed.filter((g) => g.is_child).length;
  const withNotes = guests.filter((g) => g.notes);

  function submitGuest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    const portions: Record<string, number> = {};
    event.menu.forEach((m, i) => {
      const raw = f.opt(`portion-${menuKey(m, i)}`);
      if (raw !== null && raw !== "") portions[menuKey(m, i)] = Number(raw.replace(",", "."));
    });
    sheet.run(() =>
      saveGuest(event.id, {
        id: sheet.editing?.id,
        name: f.str("name"),
        member_id: sheet.editing?.member_id ?? null,
        is_child: f.bool("is_child"),
        confirmed: f.bool("confirmed"),
        notes: f.opt("notes"),
        portions,
      })
    );
  }

  return (
    <section className="lb-card">
      <SectionTitle icon={<Users size={16} />} color="#6366F1" action={<AddButton onClick={sheet.openNew} label="Invitado" />}>
        Invitados · {confirmed.length}
        {kids ? <span className="text-meta font-normal normal-case tracking-normal text-ink-faint"> ({kids} peques)</span> : null}
      </SectionTitle>

      {guests.length === 0 && (
        <p className="mb-2 text-body text-ink-faint">
          Cargá a cada invitado con nombre: así el menú se calcula por persona y podés anotar quién es vegetariano, celíaco o come poquito.
        </p>
      )}

      {/* Alta rápida: varios nombres separados por coma */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!bulk.trim()) return;
          run("bulk", () => addGuestsBulk(event.id, bulk).then((n) => (setBulk(""), n)), "{n} invitados agregados");
        }}
      >
        <Input value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="Tío Pancho, abuela Cata, Abril…" aria-label="Nombres" />
        <button type="submit" disabled={busy === "bulk" || !bulk.trim()} className="lb-btn shrink-0 !px-4 disabled:opacity-50">
          Sumar
        </button>
      </form>
      <button
        type="button"
        disabled={busy === "home"}
        onClick={() => run("home", () => addHouseholdAsGuests(event.id), "{n} de casa sumados")}
        className="mt-2 flex min-h-9 items-center gap-1.5 text-sm font-semibold text-coral disabled:opacity-50"
      >
        <Home size={14} /> Sumar a los de casa ({members.length})
      </button>
      {msg && <p className="mt-1 text-sm text-ink-soft">{msg}</p>}

      {guests.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {guests.map((g) => (
            <li key={g.id} className="flex min-h-11 items-center gap-2 py-1.5">
              <button type="button" onClick={() => sheet.openEdit(g)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${g.confirmed ? "bg-success-soft text-success" : "bg-line text-ink-ghost"}`}>
                  {g.is_child ? <Baby size={14} /> : <Check size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-item ${g.confirmed ? "text-ink" : "text-ink-ghost line-through"}`}>{g.name}</span>
                  {(g.notes || Object.keys(g.portions ?? {}).length > 0) && (
                    <span className="block truncate text-meta text-ink-faint">
                      {[g.notes, ...event.menu.map((m, i) => (g.portions?.[menuKey(m, i)] != null ? `${formatPortion(g.portions[menuKey(m, i)])} ${m.title.toLowerCase()}` : null))]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                aria-label="Quitar invitado"
                onClick={() => run(g.id, () => deleteGuest(event.id, g.id))}
                className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-ghost"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {withNotes.length > 0 && (
        <p className="mt-2 rounded-md bg-amber-soft px-3 py-2 text-sm text-ink">
          <span className="font-semibold text-amber">Para tener en cuenta:</span> {withNotes.map((g) => `${g.name}: ${g.notes}`).join(" · ")}
        </p>
      )}

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? sheet.editing.name : "Nuevo invitado"}>
        <form onSubmit={submitGuest} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input name="name" required autoFocus defaultValue={sheet.editing?.name ?? ""} placeholder="Tía Karen" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-item text-ink">
              <input type="checkbox" name="is_child" defaultChecked={sheet.editing?.is_child ?? false} className="h-5 w-5 accent-coral" /> Es peque
            </label>
            <label className="flex items-center gap-2 text-item text-ink">
              <input type="checkbox" name="confirmed" defaultChecked={sheet.editing?.confirmed ?? true} className="h-5 w-5 accent-coral" /> Confirmado
            </label>
          </div>
          <Field label="Notas (vegetariana, celíaco, viene con la novia…)">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} />
          </Field>
          {event.menu.length > 0 && (
            <Field label="Porciones especiales" hint="Dejá vacío para usar lo normal por adulto o peque.">
              <div className="flex flex-col gap-2">
                {event.menu.map((m, i) => {
                  const key = menuKey(m, i);
                  const fallback = sheet.editing ? guestPortion(m, i, sheet.editing) : m.per_adult ?? 1;
                  return (
                    <div key={key} className="grid grid-cols-[1fr_96px] items-center gap-2">
                      <span className="text-item text-ink">{m.title}</span>
                      <Input
                        name={`portion-${key}`}
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        placeholder={formatPortion(fallback)}
                        defaultValue={sheet.editing?.portions?.[key] ?? ""}
                      />
                    </div>
                  );
                })}
              </div>
            </Field>
          )}
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} />
        </form>
      </BottomSheet>
    </section>
  );
}
