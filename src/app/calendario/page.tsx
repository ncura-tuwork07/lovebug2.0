import { SetupBanner } from "@/components/SetupBanner";

const demoEvents = [
  { id: 1, title: "Acto del colegio de Tomi", date: "Lun 15", color: "bg-sky-100 text-sky-700" },
  { id: 2, title: "Hockey de Sofi", date: "Mar 16", color: "bg-rose-100 text-rose-700" },
  { id: 3, title: "Turno pediatra", date: "Mié 17", color: "bg-amber-100 text-amber-700" },
  { id: 4, title: "Cena con los padrinos", date: "Vie 19", color: "bg-violet-100 text-violet-700" },
];

export default function CalendarioPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-rose-400">Nuestra semana</p>
        <h1 className="text-2xl font-semibold text-slate-900">Calendario</h1>
      </header>

      <SetupBanner />

      <ul className="flex flex-col gap-3">
        {demoEvents.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm shadow-rose-100"
          >
            <span className="font-medium text-slate-700">{event.title}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${event.color}`}>
              {event.date}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
