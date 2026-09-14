import { SetupBanner } from "@/components/SetupBanner";

const horizons = [
  {
    key: "week",
    label: "Esta semana",
    items: ["Arreglar la canilla del baño", "Presupuestar el pintor"],
  },
  {
    key: "month",
    label: "Este mes",
    items: ["Renovar el seguro del auto", "Organizar el cumple de Sofi"],
  },
  {
    key: "quarter",
    label: "Próximos 3 meses",
    items: ["Refacción de la cocina", "Planificar las vacaciones de verano"],
  },
];

export default function ProyectosPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-rose-400">Lo que nos proponemos</p>
        <h1 className="text-2xl font-semibold text-slate-900">Metas y proyectos</h1>
      </header>

      <SetupBanner />

      {horizons.map((horizon) => (
        <section key={horizon.key} className="rounded-3xl bg-white p-5 shadow-sm shadow-rose-100">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rose-500">
            {horizon.label}
          </h2>
          <ul className="flex flex-col gap-2">
            {horizon.items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
