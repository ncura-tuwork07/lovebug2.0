"use client";

import { useState } from "react";
import type { CalendarEvent, ImportantDate, Member } from "@/lib/types";
import type { Upcoming } from "@/lib/dates";
import { EventsList, type AgendaExtra } from "@/components/modules/EventsList";
import { ImportantDates } from "@/components/modules/ImportantDates";
import { CalendarSubscribe } from "@/components/modules/CalendarSubscribe";

export type CalendarTab = "agenda" | "fechas";

// Todo lo que tiene fecha vive acá: la agenda (eventos + cumples + vencimientos, día por día) y las
// fechas que se repiten cada año, para cargarlas y editarlas.
export function CalendarView({
  events,
  extras,
  upcoming,
  dates,
  members,
  initialTab,
}: {
  events: CalendarEvent[];
  extras: AgendaExtra[];
  upcoming: Upcoming[];
  dates: ImportantDate[];
  members: Member[];
  initialTab: CalendarTab;
}) {
  const [tab, setTab] = useState<CalendarTab>(initialTab);

  function choose(t: CalendarTab) {
    setTab(t);
    try {
      window.history.replaceState(null, "", t === "agenda" ? "/calendario" : "/calendario?tab=fechas");
    } catch {}
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md bg-line/60 p-1">
        {(["agenda", "fechas"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => choose(t)}
            className={`min-h-10 flex-1 rounded-sm text-sm font-semibold transition-colors ${tab === t ? "bg-surface text-ink shadow-soft" : "text-ink-faint"}`}
          >
            {t === "agenda" ? "Agenda" : "Fechas importantes"}
          </button>
        ))}
      </div>

      {tab === "agenda" ? (
        <EventsList events={events} members={members} extras={extras} onExtra={() => choose("fechas")} />
      ) : (
        <ImportantDates upcoming={upcoming} dates={dates} members={members} />
      )}

      <CalendarSubscribe />
    </div>
  );
}
