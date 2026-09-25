"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bike, Bus, CarFront, CheckCircle2, Circle, Footprints, MapPin, Users } from "lucide-react";
import type { Member, Transport, Trip } from "@/lib/types";
import { deleteTrip, saveTrip, toggleTrip } from "@/app/actions/trips";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { relativeDayLabel, shortTime, todayAR } from "@/lib/format";

export const TRANSPORT: Record<Transport, { label: string; icon: typeof CarFront }> = {
  auto: { label: "Auto", icon: CarFront },
  colectivo: { label: "Colectivo", icon: Bus },
  caminando: { label: "Caminando", icon: Footprints },
  bici: { label: "Bici", icon: Bike },
  moto: { label: "Moto", icon: Bike },
  otro: { label: "Otro", icon: MapPin },
};

export function TripsList({
  trips,
  members,
  currentMemberId,
  compact = false,
}: {
  trips: Trip[];
  members: Member[];
  currentMemberId: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const sheet = useSheet<Trip>();
  const [pending, setPending] = useState<string | null>(null);

  async function onToggle(trip: Trip) {
    setPending(trip.id);
    try {
      await toggleTrip(trip.id, !trip.done);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveTrip({
        id: sheet.editing?.id,
        trip_date: f.str("trip_date"),
        member_id: f.opt("member_id"),
        driver_id: f.opt("driver_id"),
        origin: f.opt("origin"),
        destination: f.str("destination"),
        departure_time: f.opt("departure_time"),
        arrival_time: f.opt("arrival_time"),
        transport: f.str("transport") as Transport,
        meet_with: f.opt("meet_with"),
        notes: f.opt("notes"),
      })
    );
  }

  const byDay = trips.reduce<Record<string, Trip[]>>((acc, t) => {
    (acc[t.trip_date] ??= []).push(t);
    return acc;
  }, {});

  const renderTrip = (trip: Trip) => {
    const who = memberById(members, trip.member_id);
    const driver = memberById(members, trip.driver_id);
    const T = TRANSPORT[trip.transport] ?? TRANSPORT.otro;
    const Icon = T.icon;
    return (
      <li key={trip.id} className={`lb-card flex items-start gap-3 !p-3 ${trip.done ? "opacity-60" : ""}`}>
        <button
          type="button"
          aria-label={trip.done ? "Marcar pendiente" : "Marcar hecho"}
          disabled={pending === trip.id}
          onClick={() => onToggle(trip)}
          className="flex h-11 w-8 shrink-0 items-center justify-center"
        >
          {trip.done ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-line" />}
        </button>
        <button type="button" onClick={() => sheet.openEdit(trip)} className="min-w-0 flex-1 text-left">
          <p className={`text-item font-medium text-ink ${trip.done ? "line-through" : ""}`}>
            {who ? `${who.name} → ` : ""}
            {trip.destination}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <Icon size={12} /> {T.label}
            </span>
            {trip.origin && <span>desde {trip.origin}</span>}
            {trip.departure_time && <span>sale {shortTime(trip.departure_time)}</span>}
            {trip.arrival_time && <span>llega {shortTime(trip.arrival_time)}</span>}
            {trip.meet_with && (
              <span className="inline-flex items-center gap-1">
                <Users size={12} /> con {trip.meet_with}
              </span>
            )}
          </p>
          {trip.notes && <p className="mt-0.5 text-meta text-ink-soft">{trip.notes}</p>}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {(trip.departure_time || trip.arrival_time) && (
            <span className="text-sm font-semibold text-success">
              {shortTime(trip.departure_time || trip.arrival_time)}
            </span>
          )}
          {driver && <MemberChip member={driver} />}
        </div>
      </li>
    );
  };

  return (
    <>
      {trips.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">
          {compact ? "Nadie tiene que ir a ningún lado hoy." : "Sin traslados cargados. Tocá + para agregar uno."}
        </p>
      )}

      {compact ? (
        <ul className="flex flex-col gap-2">{trips.map(renderTrip)}</ul>
      ) : (
        Object.keys(byDay)
          .sort()
          .map((day) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-h2 font-display uppercase tracking-wide text-success">{relativeDayLabel(day)}</h2>
              <ul className="flex flex-col gap-2">{byDay[day].map(renderTrip)}</ul>
            </section>
          ))
      )}

      {!compact && <Fab onClick={sheet.openNew} label="Nuevo traslado" />}

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar traslado" : "Nuevo traslado"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quién va">
              <MemberSelect name="member_id" members={members} noneLabel="Todos" defaultValue={sheet.editing?.member_id ?? ""} />
            </Field>
            <Field label="Fecha">
              <Input name="trip_date" type="date" required defaultValue={sheet.editing?.trip_date ?? todayAR()} />
            </Field>
          </div>
          <Field label="A dónde">
            <Input name="destination" required autoFocus defaultValue={sheet.editing?.destination ?? ""} placeholder="Club, colegio, pediatra…" />
          </Field>
          <Field label="Desde dónde (opcional)">
            <Input name="origin" defaultValue={sheet.editing?.origin ?? ""} placeholder="Casa" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sale a las">
              <Input name="departure_time" type="time" defaultValue={shortTime(sheet.editing?.departure_time ?? null)} />
            </Field>
            <Field label="Llega a las">
              <Input name="arrival_time" type="time" defaultValue={shortTime(sheet.editing?.arrival_time ?? null)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cómo va">
              <Select name="transport" defaultValue={sheet.editing?.transport ?? "auto"}>
                {(Object.keys(TRANSPORT) as Transport[]).map((k) => (
                  <option key={k} value={k}>
                    {TRANSPORT[k].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quién lleva">
              <MemberSelect
                name="driver_id"
                members={members.filter((m) => !m.is_child)}
                noneLabel="Nadie / va solo"
                defaultValue={sheet.editing?.driver_id ?? currentMemberId ?? ""}
              />
            </Field>
          </div>
          <Field label="Se encuentra con (opcional)">
            <Input name="meet_with" defaultValue={sheet.editing?.meet_with ?? ""} placeholder="La abuela, el papá de Juan…" />
          </Field>
          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={sheet.editing ? () => sheet.run(() => deleteTrip(sheet.editing!.id)) : undefined}
          />
        </form>
      </BottomSheet>
    </>
  );
}
