import { SetupBanner } from "@/components/SetupBanner";
import { DailyInspiration } from "@/components/DailyInspiration";
import { PersonChip, type PersonKey } from "@/components/ui/PersonChip";
import { CalendarHeart, CarFront, CheckCircle2, Circle } from "lucide-react";

const today = new Date().toLocaleDateString("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const demoTasks: { id: number; title: string; done: boolean; who: PersonKey }[] = [
  { id: 1, title: "Pedir presupuesto del portón", done: false, who: "naza" },
  { id: 2, title: "Comprar la pintura del living", done: false, who: "familia" },
  { id: 3, title: "Confirmar cumple de Juana", done: true, who: "jaz" },
];

const demoTrips: { id: number; who: string; destination: string; time: string; driver: PersonKey }[] = [
  { id: 1, who: "Salvador", destination: "Club Los Pinos", time: "17:00", driver: "jaz" },
  { id: 2, who: "Ariana", destination: "Inglés", time: "18:30", driver: "naza" },
];

const demoEvents = [{ id: 1, title: "Acto del colegio de Juana", time: "09:00" }];

export default function HoyPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-amber">Hoy es</p>
        <h1 className="text-display font-display font-bold capitalize text-ink">{today}</h1>
      </header>

      <SetupBanner />

      <section className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
          <CheckCircle2 size={16} /> Tareas de hoy
        </h2>
        <ul className="flex flex-col gap-3">
          {demoTasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 text-item">
              {task.done ? (
                <CheckCircle2 size={18} className="text-success" />
              ) : (
                <Circle size={18} className="text-line" />
              )}
              <span className={task.done ? "flex-1 text-ink-ghost line-through" : "flex-1 text-ink"}>
                {task.title}
              </span>
              <PersonChip person={task.who} />
            </li>
          ))}
        </ul>
      </section>

      <section className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-success">
          <CarFront size={16} /> Logística de hoy
        </h2>
        <ul className="flex flex-col gap-3">
          {demoTrips.map((trip) => (
            <li key={trip.id} className="flex items-center justify-between text-item">
              <div>
                <p className="font-medium text-ink">
                  {trip.who} → {trip.destination}
                </p>
                <p className="text-meta text-ink-faint">Lleva:</p>
              </div>
              <div className="flex items-center gap-2">
                <PersonChip person={trip.driver} />
                <span className="text-sm font-semibold text-success">{trip.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="lb-card">
        <h2 className="text-h2 mb-3 flex items-center gap-2 font-display uppercase tracking-wide text-info">
          <CalendarHeart size={16} /> En el calendario
        </h2>
        <ul className="flex flex-col gap-3">
          {demoEvents.map((event) => (
            <li key={event.id} className="flex items-center justify-between text-item">
              <span className="text-ink">{event.title}</span>
              <span className="text-sm font-semibold text-info">{event.time}</span>
            </li>
          ))}
        </ul>
      </section>

      <DailyInspiration />
    </div>
  );
}
