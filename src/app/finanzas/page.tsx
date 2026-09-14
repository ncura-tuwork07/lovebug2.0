import { SetupBanner } from "@/components/SetupBanner";

const demoExpenses = [
  { id: 1, description: "Supermercado", amount: 45000, who: "Jazmín", fixed: false },
  { id: 2, description: "Alquiler", amount: 380000, who: "Naza", fixed: true },
  { id: 3, description: "Fideos y snacks", amount: 6200, who: "Naza", fixed: false },
];

const demoGoals = [
  { id: 1, title: "Auto", current: 850000, target: 4000000 },
  { id: 2, title: "Casa (pie)", current: 1200000, target: 15000000 },
];

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

export default function FinanzasPage() {
  const monthTotal = demoExpenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedTotal = demoExpenses.filter((e) => e.fixed).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm text-rose-400">Nuestra plata</p>
        <h1 className="text-2xl font-semibold text-slate-900">Finanzas</h1>
      </header>

      <SetupBanner />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-rose-100">
          <p className="text-xs text-slate-400">Gastado este mes</p>
          <p className="text-lg font-semibold text-slate-800">{formatARS(monthTotal)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-rose-100">
          <p className="text-xs text-slate-400">Gastos fijos</p>
          <p className="text-lg font-semibold text-slate-800">{formatARS(fixedTotal)}</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-rose-100">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rose-500">
          Últimos gastos
        </h2>
        <ul className="flex flex-col gap-3">
          {demoExpenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-slate-700">{expense.description}</p>
                <p className="text-xs text-slate-400">{expense.who}</p>
              </div>
              <span className="font-semibold text-slate-700">{formatARS(expense.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-rose-100">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rose-500">
          Objetivos de ahorro
        </h2>
        <ul className="flex flex-col gap-4">
          {demoGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            return (
              <li key={goal.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{goal.title}</span>
                  <span className="text-xs text-slate-400">
                    {formatARS(goal.current)} / {formatARS(goal.target)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-rose-50">
                  <div
                    className="h-full rounded-full bg-rose-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
