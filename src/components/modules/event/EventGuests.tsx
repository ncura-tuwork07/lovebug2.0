"use client";

import { useState, type FormEvent } from "react";
import { Baby, Check, Contact as ContactIcon, Home, Trash2, Users } from "lucide-react";
import type { Contact, EventGuest, FamilyEvent, Member } from "@/lib/types";
import { addContactsAsGuests, addGuestsBulk, addHouseholdAsGuests, deleteGuest, saveGuest } from "@/app/actions/familyEvents";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatPortion, guestPortion, menuKey } from "@/lib/events";
import { AddButton, SectionTitle, useRun } from "./shared";

export function EventGuests({
  event,
  guests,
  members,
  contacts = [],
}: {
  event: FamilyEvent;
  guests: EventGuest[];
  members: Member[];
  contacts?: Contact[];
}) {
  const sheet = useSheet<EventGuest>();
  const { busy, msg, run } = useRun();
  const [bulk, setBulk] = useState("");
  const [circleOpen, setCircleOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const confirmed = guests.filter((g) => g.confirmed);
  const kids = confirmed.filter((g) => g.is_child).length;
  const withNotes = guests.filter((g) => g.notes);
  const alreadyGuestContactIds = new Set(guests.map((g) => g.contact_id).filter(Boolean));
  const circleOptions = contacts.filter((c) => !alreadyGuestContactIds.has(c.id));
  // Nueva persona = no viene de un integrante de casa ni ya está en el Círculo.
  const isNewPerson = !sheet.editing?.member_id && !sheet.editing?.contact_id;

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
        saveToCircle: isNewPerson && f.bool("save_to_circle"),
      })
    );
  }

  function submitCircle(e: FormEvent) {
    e.preventDefault();
    const ids = [...picked];
    if (!ids.length) return;
    run("circle", () => addContactsAsGuests(event.id, ids), "{n} del círculo sumados").then(() => {
      setPicked(new Set());
      setCircleOpen(false);
    });
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
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy === "home"}
          onClick={() => run("home", () => addHouseholdAsGuests(event.id), "{n} de casa sumados")}
          className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-coral disabled:opacity-50"
        >
          <Home size={14} /> Sumar a los de casa ({members.length})
        </button>
        {circleOptions.length > 0 && (
          <button
            type="button"
            onClick={() => setCircleOpen(true)}
            className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-coral"
          >
            <ContactIcon size={14} /> Sumar del Círculo ({circleOptions.length})
          </button>
        )}
      </div>
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
          {isNewPerson && (
            <label className="flex items-center gap-3 rounded-md bg-info-soft px-3 py-2.5">
              <input type="checkbox" name="save_to_circle" defaultChecked className="h-5 w-5 accent-info" />
              <span className="text-item text-ink">
                Guardar en tu Círculo
                <span className="block text-meta text-ink-faint">Para tenerla ya cargada la próxima vez. Si no, queda solo para este evento.</span>
              </span>
            </label>
          )}
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

      {/* Sheet: elegir del Círculo */}
      <BottomSheet open={circleOpen} onClose={() => setCircleOpen(false)} title="Sumar del Círculo">
        <form onSubmit={submitCircle} className="flex flex-col gap-4">
          {circleOptions.length === 0 ? (
            <p className="text-body text-ink-faint">Ya están todos los de tu Círculo invitados a este evento.</p>
          ) : (
            <ul className="flex max-h-[50vh] flex-col divide-y divide-line overflow-y-auto">
              {circleOptions.map((c) => (
                <li key={c.id}>
                  <label className="flex min-h-12 items-center gap-3 py-1">
                    <input
                      type="checkbox"
                      checked={picked.has(c.id)}
                      onChange={(e) =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        })
                      }
                      className="h-5 w-5 accent-coral"
                    />
                    {c.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info-soft text-sm font-bold text-info">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-item text-ink">{c.name}</span>
                      {c.relationship && <span className="block truncate text-meta text-ink-faint">{c.relationship}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button type="submit" disabled={busy === "circle" || picked.size === 0} className="lb-btn disabled:opacity-50">
            {busy === "circle" ? "Sumando…" : `Sumar ${picked.size || ""}`.trim()}
          </button>
        </form>
      </BottomSheet>
    </section>
  );
}
