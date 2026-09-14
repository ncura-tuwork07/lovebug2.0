import { SetupBanner } from "@/components/SetupBanner";

const demoEvents = [
  { id: 1, title: "Acto del colegio de Tomi", date: "Lun 15" },
  { id: 2, title: "Hockey de Sofi", date: "Mar 16" },
  { id: 3, title: "Turno pediatra", date: "Mié 17" },
  { id: 4, title: "Cena con los padrinos", date: "Vie 19" },
];

export default function CalendarioPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-info">Nuestra semana</p>
        <h1 className="text-2xl font-semibold text-ink">Calendario</h1>
      </header>

      <SetupBanner />

      <ul className="flex flex-col gap-3">
        {demoEvents.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm shadow-black/5"
          >
            <span className="font-medium text-ink/80">{event.title}</span>
            <span className="rounded-full bg-info/10 px-3 py-1 text-xs font-semibold text-info">
              {event.date}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
