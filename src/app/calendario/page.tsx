import { SetupBanner } from "@/components/SetupBanner";

const categories = {
  colegio: { name: "Colegio", hex: "var(--color-cat-colegio)", bg: "#EAF2FE", fg: "#1D4E96" },
  salud: { name: "Salud", hex: "var(--color-cat-salud)", bg: "#FFF1EC", fg: "#B23B3F" },
  actividades: { name: "Actividades", hex: "var(--color-cat-activ)", bg: "#E9FAF3", fg: "#0B7A5E" },
  social: { name: "Social", hex: "var(--color-cat-social)", bg: "#FFF6E8", fg: "#8A6A2E" },
} as const;

const demoEvents: { id: number; title: string; date: string; category: keyof typeof categories }[] = [
  { id: 1, title: "Acto del colegio de Juana", date: "Lun 15", category: "colegio" },
  { id: 2, title: "Hockey de Ariana", date: "Mar 16", category: "actividades" },
  { id: 3, title: "Turno pediatra de Salvador", date: "Mié 17", category: "salud" },
  { id: 4, title: "Cena con los padrinos", date: "Vie 19", category: "social" },
];

export default function CalendarioPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-info">Nuestra semana</p>
        <h1 className="text-h1 font-display font-bold text-ink">Calendario</h1>
      </header>

      <SetupBanner />

      <ul className="flex flex-col gap-3">
        {demoEvents.map((event) => {
          const cat = categories[event.category];
          return (
            <li key={event.id} className="lb-card flex items-center justify-between !p-4">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.hex }} />
                <span className="font-medium text-ink">{event.title}</span>
              </div>
              <span
                className="lb-chip"
                style={{ backgroundColor: cat.bg, color: cat.fg }}
              >
                {event.date}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
