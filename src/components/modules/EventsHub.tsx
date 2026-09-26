"use client";

import { type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, MapPin, PartyPopper, Users } from "lucide-react";
import type { FamilyEvent } from "@/lib/types";
import { saveFamilyEvent } from "@/app/actions/familyEvents";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS, formatDay, shortTime, todayAR } from "@/lib/format";
import { daysUntilLabel } from "@/lib/dates";
import { EmptyAction } from "@/components/ui/EmptyAction";

export function EventsHub({ events }: { events: FamilyEvent[] }) {
  const router = useRouter();
  const sheet = useSheet<FamilyEvent>();
  const today = todayAR();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(async () => {
      const id = await saveFamilyEvent({
        title: f.str("title"),
        event_date: f.str("event_date"),
        event_time: f.opt("event_time"),
        location: f.opt("location"),
        guests: f.str("guests"),
        budget: f.opt("budget"),
        notes: f.opt("notes"),
      });
      router.push(`/eventos/${id}`);
    });
  }

  const upcoming = events.filter((e) => e.status !== "done" && e.event_date >= today);
  const past = events.filter((e) => e.status === "done" || e.event_date < today);

  const card = (ev: FamilyEvent) => {
    const days = Math.round((Date.parse(ev.event_date) - Date.parse(today)) / 86400000);
    return (
      <li key={ev.id}>
        <Link href={`/eventos/${ev.id}`} className="lb-card flex items-center gap-3 !p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral">
            <PartyPopper size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-item font-medium text-ink">{ev.title}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-meta text-ink-faint">
              <span>
                {formatDay(ev.event_date, "EEE d MMM")}
                {ev.event_time ? ` · ${shortTime(ev.event_time)}` : ""}
              </span>
              {ev.guests > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users size={11} /> {ev.guests}
                </span>
              )}
              {ev.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {ev.location}
                </span>
              )}
              {ev.budget && <span>· {formatARS(Number(ev.budget))}</span>}
            </p>
            {ev.memory_note && <p className="mt-0.5 truncate font-accent text-lg leading-tight text-ink-soft">“{ev.memory_note}”</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {ev.status !== "done" && days >= 0 && (
              <span className={`text-sm font-semibold ${days <= 3 ? "text-coral" : "text-ink-faint"}`}>{daysUntilLabel(days)}</span>
            )}
            <ChevronRight size={16} className="text-ink-ghost" />
          </div>
        </Link>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {events.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-accent text-2xl text-ink-faint">Un cumple, un asado, la comunión… y armamos el menú, las compras y las tareas.</p>
          <EmptyAction label="Armar un evento" onClick={sheet.openNew} />
        </div>
      )}
      {upcoming.length > 0 && <ul className="flex flex-col gap-2">{upcoming.map(card)}</ul>}
      {past.length > 0 && (
        <section>
          <h2 className="text-label mb-2 font-display uppercase tracking-wider text-ink-ghost">Pasados</h2>
          <ul className="flex flex-col gap-2 opacity-70">{past.map(card)}</ul>
        </section>
      )}

      <Fab onClick={sheet.openNew} label="Nuevo evento" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title="Nuevo evento">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Qué celebran">
            <Input name="title" required autoFocus placeholder="Cumple de la abuela" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input name="event_date" type="date" required defaultValue={today} />
            </Field>
            <Field label="Hora (opcional)">
              <Input name="event_time" type="time" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invitados">
              <Input name="guests" type="number" inputMode="numeric" min="0" defaultValue={10} />
            </Field>
            <Field label="Presupuesto ($, opcional)">
              <Input name="budget" type="number" inputMode="decimal" step="any" min="0" placeholder="0" />
            </Field>
          </div>
          <Field label="Dónde (opcional)">
            <Input name="location" placeholder="Casa, salón, quinta…" />
          </Field>
          <Field label="Notas (opcional)">
            <Textarea name="notes" />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} submitLabel="Crear y planificar" />
        </form>
      </BottomSheet>
    </div>
  );
}
