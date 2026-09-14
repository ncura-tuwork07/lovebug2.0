import { SetupBanner } from "@/components/SetupBanner";
import { PersonChip, type PersonKey } from "@/components/ui/PersonChip";

const horizons: {
  key: string;
  label: string;
  color: string;
  items: { name: string; pct: number; meta: string; who: PersonKey }[];
}[] = [
  {
    key: "week",
    label: "Esta semana",
    color: "var(--color-coral)",
    items: [{ name: "Pedir presupuesto del portón", pct: 60, meta: "Faltan 2 llamados", who: "naza" }],
  },
  {
    key: "month",
    label: "Este mes",
    color: "var(--color-amber)",
    items: [
      { name: "Pintar el living", pct: 10, meta: "Falta comprar la pintura", who: "familia" },
      { name: "Service del auto", pct: 0, meta: "Vence el 30/05", who: "naza" },
    ],
  },
  {
    key: "quarter",
    label: "Próximos 3 meses",
    color: "var(--color-success)",
    items: [{ name: "Refacción de la cocina", pct: 18, meta: "Sincronizado con el ahorro", who: "familia" }],
  },
];

export default function ProyectosPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm" style={{ color: "var(--color-jaz)" }}>
          Lo que nos proponemos
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Metas y proyectos</h1>
      </header>

      <SetupBanner />

      {horizons.map((horizon) => (
        <section key={horizon.key} className="lb-card">
          <h2
            className="text-h2 mb-3 font-display uppercase tracking-wide"
            style={{ color: horizon.color }}
          >
            {horizon.label}
          </h2>
          <ul className="flex flex-col gap-3">
            {horizon.items.map((item) => (
              <li key={item.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-item">
                  <span className="text-ink">{item.name}</span>
                  <PersonChip person={item.who} />
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.pct}%`, backgroundColor: horizon.color }}
                  />
                </div>
                <p className="text-meta text-ink-faint">{item.meta}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
