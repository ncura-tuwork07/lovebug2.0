"use client";

import { type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ListChecks, ShoppingCart } from "lucide-react";
import type { Contact, EventGuest, EventItem, FamilyEvent, Member, PantryItem, Recipe, ShoppingItem, Task } from "@/lib/types";
import { addEventTask, deleteFamilyEvent, saveFamilyEvent, setEventStatus } from "@/app/actions/familyEvents";
import { toggleTask } from "@/app/actions/tasks";
import { toggleShoppingItem } from "@/app/actions/shopping";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, MemberSelect, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatDay, shortTime, todayAR } from "@/lib/format";
import { daysUntilLabel } from "@/lib/dates";
import { confirmedCount } from "@/lib/events";
import { EventGuests } from "./event/EventGuests";
import { EventMenu } from "./event/EventMenu";
import { EventExtras } from "./event/EventExtras";
import { EventBudget, type ExpenseWithReceipt } from "./event/EventBudget";
import { EventMemories, type AttachmentWithUrl } from "./event/EventMemories";
import { AddButton, SectionTitle, useRun } from "./event/shared";

export function EventDetail({
  event,
  guests,
  contacts,
  items,
  photos,
  recipes,
  pantry,
  shopping,
  tasks,
  expenses,
  members,
  currentMemberId,
  householdId,
}: {
  event: FamilyEvent;
  guests: EventGuest[];
  contacts: Contact[];
  items: EventItem[];
  photos: AttachmentWithUrl[];
  recipes: Recipe[];
  pantry: PantryItem[];
  shopping: ShoppingItem[];
  tasks: Task[];
  expenses: ExpenseWithReceipt[];
  members: Member[];
  currentMemberId: string | null;
  householdId: string;
}) {
  const router = useRouter();
  const editSheet = useSheet<FamilyEvent>();
  const taskSheet = useSheet<Task>();
  const { busy, msg, run } = useRun();
  const today = todayAR();
  const days = Math.round((Date.parse(event.event_date) - Date.parse(today)) / 86400000);
  const isPast = event.status === "done" || days < 0;
  const people = confirmedCount(event, guests);
  const estimatedExtras = items.reduce((s, i) => s + Number(i.estimated_cost ?? 0), 0);

  function submitEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    editSheet.run(async () => {
      await saveFamilyEvent({
        id: event.id,
        title: f.str("title"),
        event_date: f.str("event_date"),
        event_time: f.opt("event_time"),
        location: f.opt("location"),
        guests: guests.length ? event.guests : f.str("guests"),
        budget: f.opt("budget"),
        notes: f.opt("notes"),
      });
    });
  }

  function submitTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    taskSheet.run(() => addEventTask(event.id, f.str("title"), f.opt("assigned_to"), f.str("due_date")));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <section className="lb-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-h1 font-display font-bold text-ink">{event.title}</h1>
            <p className="text-body text-ink-soft">
              {formatDay(event.event_date, "EEEE d 'de' MMMM")}
              {event.event_time ? ` · ${shortTime(event.event_time)}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            <p className="text-meta text-ink-faint">
              {people} {people === 1 ? "invitado" : "invitados"}
              {event.notes ? ` · ${event.notes}` : ""}
            </p>
          </div>
          {event.status !== "done" && days >= 0 && (
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${days <= 3 ? "bg-coral-soft text-coral" : "bg-amber-soft text-amber"}`}>
              {daysUntilLabel(days)}
            </span>
          )}
          {event.status === "done" && <span className="shrink-0 rounded-full bg-line px-3 py-1 text-sm font-semibold text-ink-soft">Ya pasó</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => editSheet.openEdit(event)} className="lb-chip min-h-9 border-[1.5px] border-line text-ink-soft">
            Editar datos
          </button>
          <button
            type="button"
            disabled={busy === "status"}
            onClick={() => run("status", () => setEventStatus(event.id, event.status === "done" ? "planning" : "done"))}
            className="lb-chip min-h-9 border-[1.5px] border-line text-ink-soft disabled:opacity-50"
          >
            {event.status === "done" ? "Reabrir" : "Marcar como pasado"}
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
      </section>

      {isPast && <EventMemories event={event} photos={photos} householdId={householdId} />}

      <EventGuests event={event} guests={guests} members={members} contacts={contacts} />
      <EventMenu event={event} guests={guests} recipes={recipes} pantry={pantry} currentMemberId={currentMemberId} />
      <EventExtras event={event} items={items} currentMemberId={currentMemberId} />

      {/* Compras del evento (lo que ya está en la lista) */}
      {shopping.length > 0 && (
        <section className="lb-card">
          <SectionTitle icon={<ShoppingCart size={16} />} color="#FF9F43">
            En la lista de Compras · {shopping.filter((s) => !s.checked).length} pendientes
          </SectionTitle>
          <ul>
            {shopping.map((s) => (
              <li key={s.id} className="flex min-h-10 items-center gap-2">
                <button type="button" aria-label="Marcar" onClick={() => run(s.id, () => toggleShoppingItem(s.id, !s.checked))} className="flex h-10 w-8 items-center justify-center">
                  {s.checked ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-line" />}
                </button>
                <span className={`flex-1 text-item ${s.checked ? "text-ink-ghost line-through" : "text-ink"}`}>
                  {s.name}
                  {s.quantity && <span className="text-meta text-ink-faint"> × {s.quantity}</span>}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/compras" className="mt-2 inline-block text-sm font-semibold text-coral">
            Ver toda la lista →
          </Link>
        </section>
      )}

      <EventBudget event={event} expenses={expenses} estimatedExtras={estimatedExtras} members={members} currentMemberId={currentMemberId} householdId={householdId} />

      {/* Tareas */}
      <section className="lb-card">
        <SectionTitle icon={<ListChecks size={16} />} color="var(--color-amber)" action={<AddButton onClick={taskSheet.openNew} label="Tarea" />}>
          Tareas previas
        </SectionTitle>
        {tasks.length === 0 && <p className="text-body text-ink-faint">Reservar el salón, encargar la torta, mandar invitaciones…</p>}
        <ul>
          {tasks.map((t) => (
            <li key={t.id} className="flex min-h-10 items-center gap-2">
              <button type="button" aria-label="Marcar" onClick={() => run(t.id, () => toggleTask(t.id, !t.done))} className="flex h-10 w-8 items-center justify-center">
                {t.done ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-line" />}
              </button>
              <span className={`flex-1 text-item ${t.done ? "text-ink-ghost line-through" : "text-ink"}`}>{t.title}</span>
              <span className="text-meta text-ink-faint">{formatDay(t.due_date, "d MMM")}</span>
              <MemberChip member={memberById(members, t.assigned_to)} />
            </li>
          ))}
        </ul>
      </section>

      {!isPast && <EventMemories event={event} photos={photos} householdId={householdId} />}

      <button
        type="button"
        onClick={() => {
          if (confirm(`¿Borramos "${event.title}" con invitados, menú, fotos y tareas?`)) run("del", () => deleteFamilyEvent(event.id).then(() => router.push("/eventos")));
        }}
        className="min-h-11 text-sm font-semibold text-danger"
      >
        Borrar evento
      </button>

      {/* Sheet editar */}
      <BottomSheet open={editSheet.open} onClose={editSheet.close} title="Editar evento">
        <form onSubmit={submitEdit} className="flex flex-col gap-4">
          <Field label="Qué celebran">
            <Input name="title" required defaultValue={event.title} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input name="event_date" type="date" required defaultValue={event.event_date} />
            </Field>
            <Field label="Hora">
              <Input name="event_time" type="time" defaultValue={shortTime(event.event_time)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invitados" hint={guests.length ? "Se cuenta solo desde la lista de invitados." : undefined}>
              <Input name="guests" type="number" inputMode="numeric" min="0" defaultValue={event.guests} disabled={guests.length > 0} />
            </Field>
            <Field label="Presupuesto ($)">
              <Input name="budget" type="number" inputMode="decimal" step="any" min="0" defaultValue={event.budget ?? ""} />
            </Field>
          </div>
          <Field label="Dónde">
            <Input name="location" defaultValue={event.location ?? ""} />
          </Field>
          <Field label="Notas">
            <Textarea name="notes" defaultValue={event.notes ?? ""} />
          </Field>
          {editSheet.error && <p className="text-sm text-danger">{editSheet.error}</p>}
          <SubmitRow saving={editSheet.saving} />
        </form>
      </BottomSheet>

      {/* Sheet tarea */}
      <BottomSheet open={taskSheet.open} onClose={taskSheet.close} title="Tarea del evento">
        <form onSubmit={submitTask} className="flex flex-col gap-4">
          <Field label="Qué hay que hacer">
            <Input name="title" required autoFocus placeholder="Encargar la torta" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quién">
              <MemberSelect name="assigned_to" members={members} defaultValue={currentMemberId ?? ""} />
            </Field>
            <Field label="Para cuándo">
              <Input name="due_date" type="date" required defaultValue={event.event_date} />
            </Field>
          </div>
          {taskSheet.error && <p className="text-sm text-danger">{taskSheet.error}</p>}
          <SubmitRow saving={taskSheet.saving} submitLabel="Agregar" />
        </form>
      </BottomSheet>
    </div>
  );
}
