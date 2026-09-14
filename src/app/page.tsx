import { SetupBanner } from "@/components/SetupBanner";
import { DailyInspiration } from "@/components/DailyInspiration";
import { CalendarHeart, CarFront, CheckCircle2, Circle } from "lucide-react";

const today = new Date().toLocaleDateString("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const demoTasks = [
  { id: 1, title: "Pagar expensas", done: false, who: "Naza" },
  { id: 2, title: "Comprar útiles para Sofi", done: true, who: "Jazmín" },
  { id: 3, title: "Llamar al plomero", done: false, who: "Naza" },
];

const demoTrips = [
  { id: 1, who: "Tomi", destination: "Club", time: "17:00", driver: "Naza" },
  { id: 2, who: "Sofi", destination: "Inglés", time: "18:30", driver: "Jazmín" },
];

const demoEvents = [
  { id: 1, title: "Acto del colegio de Tomi", time: "09:00" },
];

export default function HoyPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-secondary">Hoy es</p>
        <h1 className="text-2xl font-semibold capitalize text-ink">{today}</h1>
      </header>

      <SetupBanner />

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-secondary">
          <CheckCircle2 size={16} /> Tareas de hoy
        </h2>
        <ul className="flex flex-col gap-3">
          {demoTasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 text-sm">
              {task.done ? (
                <CheckCircle2 size={18} className="text-success" />
              ) : (
                <Circle size={18} className="text-surface" />
              )}
              <span className={task.done ? "flex-1 text-ink/40 line-through" : "flex-1 text-ink/80"}>
                {task.title}
              </span>
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">
                {task.who}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-success">
          <CarFront size={16} /> Logística de hoy
        </h2>
        <ul className="flex flex-col gap-3">
          {demoTrips.map((trip) => (
            <li key={trip.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-ink/80">
                  {trip.who} → {trip.destination}
                </p>
                <p className="text-xs text-ink/40">Lleva: {trip.driver}</p>
              </div>
              <span className="text-sm font-semibold text-success">{trip.time}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-info">
          <CalendarHeart size={16} /> En el calendario
        </h2>
        <ul className="flex flex-col gap-3">
          {demoEvents.map((event) => (
            <li key={event.id} className="flex items-center justify-between text-sm">
              <span className="text-ink/80">{event.title}</span>
              <span className="text-sm font-semibold text-info">{event.time}</span>
            </li>
          ))}
        </ul>
      </section>

      <DailyInspiration />
    </div>
  );
}
