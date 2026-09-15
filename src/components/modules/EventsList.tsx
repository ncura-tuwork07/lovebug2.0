"use client";

import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import type { CalendarEvent, EventCategory, Member } from "@/lib/types";
import { deleteEvent, saveEvent } from "@/app/actions/events";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { TZ, relativeDayLabel, timeHM, todayAR } from "@/lib/format";

export const CATEGORIES: Record<EventCategory, { name: string; hex: string; bg: string; fg: string }> = {
  colegio: { name: "Colegio", hex: "#3B82F6", bg: "#EAF2FE", fg: "#1D4E96" },
  salud: { name: "Salud", hex: "#FF5A5F", bg: "#FFF1EC", fg: "#B23B3F" },
  actividades: { name: "Actividades", hex: "#10B981", bg: "#E9FAF3", fg: "#0B7A5E" },
  social: { name: "Social", hex: "#FFB347", bg: "#FFF6E8", fg: "#8A6A2E" },
  casa: { name: "Casa / hogar", hex: "#8B5CF6", bg: "#F4EFFE", fg: "#5B3BA8" },
  plata: { name: "Plata", hex: "#1E293B", bg: "#F1F2F5", fg: "#32405A" },
  familia: { name: "Familia", hex: "#EC4899", bg: "#FDECF4", fg: "#9D2A63" },
  trabajo: { name: "Trabajo", hex: "#64748B", bg: "#F1F5F9", fg: "#334155" },
};

function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

export function EventsList({
  events,
  members,
  compact = false,
}: {
  events: CalendarEvent[];
  members: Member[];
  compact?: boolean;
}) {
  const sheet = useSheet<CalendarEvent>();
  const [allDay, setAllDay] = useState(false);

  function openNew() {
    setAllDay(false);
    sheet.openNew();
  }
  function openEdit(ev: CalendarEvent) {
    setAllDay(ev.all_day);
    sheet.openEdit(ev);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveEvent({
        id: sheet.editing?.id,
        title: f.str("title"),
        category: f.str("category") as EventCategory,
        member_id: f.opt("member_id"),
        date: f.str("date"),
        start_time: f.opt("start_time"),
        end_time: f.opt("end_time"),
        all_day: f.bool("all_day"),
        location: f.opt("location"),
        notes: f.opt("notes"),
      })
    );
  }

  const byDay = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    (acc[dayKey(ev.starts_at)] ??= []).push(ev);
    return acc;
  }, {});

  const renderEvent = (ev: CalendarEvent) => {
    const cat = CATEGORIES[ev.category] ?? CATEGORIES.familia;
    const member = memberById(members, ev.member_id);
    return (
      <li key={ev.id}>
        <button
          type="button"
          onClick={() => openEdit(ev)}
          className="lb-card flex w-full items-center gap-3 !p-3 text-left"
          style={{ borderLeft: `4px solid ${cat.hex}` }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-item font-medium text-ink">{ev.title}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-meta text-ink-faint">
              <span className="font-semibold" style={{ color: cat.fg }}>
                {cat.name}
              </span>
              {ev.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {ev.location}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-sm font-semibold text-info">
              {ev.all_day ? "Todo el día" : timeHM(ev.starts_at) + (ev.ends_at ? `–${timeHM(ev.ends_at)}` : "")}
            </span>
            {member && <MemberChip member={member} />}
          </div>
        </button>
      </li>
    );
  };

  const editingDate = sheet.editing ? dayKey(sheet.editing.starts_at) : todayAR();
  const editingStart = sheet.editing && !sheet.editing.all_day ? timeHM(sheet.editing.starts_at) : "";
  const editingEnd = sheet.editing?.ends_at ? timeHM(sheet.editing.ends_at) : "";

  return (
    <>
      {events.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">
          {compact ? "Nada en el calendario para hoy." : "Todavía no hay eventos. Tocá + para crear el primero."}
        </p>
      )}

      {compact ? (
        <ul className="flex flex-col gap-2">{events.map(renderEvent)}</ul>
      ) : (
        Object.keys(byDay)
          .sort()
          .map((day) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-h2 font-display uppercase tracking-wide text-info">{relativeDayLabel(day)}</h2>
              <ul className="flex flex-col gap-2">{byDay[day].map(renderEvent)}</ul>
            </section>
          ))
      )}

      {!compact && <Fab onClick={openNew} label="Nuevo evento" />}

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar evento" : "Nuevo evento"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Qué pasa">
            <Input name="title" required autoFocus defaultValue={sheet.editing?.title ?? ""} placeholder="Acto del colegio, turno médico…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <Select name="category" defaultValue={sheet.editing?.category ?? "familia"}>
                {(Object.keys(CATEGORIES) as EventCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {CATEGORIES[k].name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="De quién">
              <MemberSelect name="member_id" members={members} defaultValue={sheet.editing?.member_id ?? ""} />
            </Field>
          </div>
          <Field label="Fecha">
            <Input name="date" type="date" required defaultValue={editingDate} />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input type="checkbox" name="all_day" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-5 w-5 accent-coral" />
            Todo el día
          </label>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empieza">
                <Input name="start_time" type="time" defaultValue={editingStart} />
              </Field>
              <Field label="Termina (opcional)">
                <Input name="end_time" type="time" defaultValue={editingEnd} />
              </Field>
            </div>
          )}
          <Field label="Lugar (opcional)">
            <Input name="location" defaultValue={sheet.editing?.location ?? ""} />
          </Field>
          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={sheet.editing ? () => sheet.run(() => deleteEvent(sheet.editing!.id)) : undefined}
          />
        </form>
      </BottomSheet>
    </>
  );
}
