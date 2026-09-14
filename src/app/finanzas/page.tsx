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
        <p className="text-sm text-primary">Nuestra plata</p>
        <h1 className="text-2xl font-semibold text-ink">Finanzas</h1>
      </header>

      <SetupBanner />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-ink/40">Gastado este mes</p>
          <p className="text-lg font-semibold text-ink">{formatARS(monthTotal)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-ink/40">Gastos fijos</p>
          <p className="text-lg font-semibold text-ink">{formatARS(fixedTotal)}</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          Últimos gastos
        </h2>
        <ul className="flex flex-col gap-3">
          {demoExpenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-ink/80">{expense.description}</p>
                <p className="text-xs text-ink/40">{expense.who}</p>
              </div>
              <span className="font-semibold text-ink/80">{formatARS(expense.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm shadow-black/5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-success">
          Objetivos de ahorro
        </h2>
        <ul className="flex flex-col gap-4">
          {demoGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            return (
              <li key={goal.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink/80">{goal.title}</span>
                  <span className="text-xs text-ink/40">
                    {formatARS(goal.current)} / {formatARS(goal.target)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-success/10">
                  <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
