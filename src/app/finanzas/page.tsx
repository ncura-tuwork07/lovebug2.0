import { SetupBanner } from "@/components/SetupBanner";

const demoExpenses = [
  { id: 1, description: "Supermercado Coto", meta: "Hoy 11:20 · cargó Jaz", amount: 38400 },
  { id: 2, description: "Nafta", meta: "Ayer 18:05 · cargó Naza", amount: 25000 },
  { id: 3, description: "Cuota colegio", meta: "5 de mayo · fijo", amount: 142000 },
];

const demoGoals = [
  { id: 1, title: "Auto", current: 1260000, target: 3000000, color: "var(--color-coral)" },
  { id: 2, title: "Casa (pie)", current: 540000, target: 3000000, color: "var(--color-success)" },
];

const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

export default function FinanzasPage() {
  const monthTotal = demoExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-6 px-4 pt-8">
      <header>
        <p className="text-sm" style={{ color: "var(--color-ariana)" }}>
          Nuestra plata
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Finanzas</h1>
      </header>

      <SetupBanner />

      <section className="lb-card">
        <p className="text-label font-display uppercase text-ink-ghost">Saldo en cuenta</p>
        <p className="text-display font-display font-bold text-ink">{formatARS(482350)}</p>
        <p className="mt-1 text-sm font-semibold text-success">↑ 12% vs. mes anterior</p>
      </section>

      <section className="lb-card">
        <h2 className="text-h2 mb-3 font-display uppercase tracking-wide" style={{ color: "var(--color-ariana)" }}>
          Últimos gastos ({formatARS(monthTotal)} este mes)
        </h2>
        <ul className="flex flex-col gap-3">
          {demoExpenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between text-item">
              <div>
                <p className="text-ink">{expense.description}</p>
                <p className="text-meta text-ink-faint">{expense.meta}</p>
              </div>
              <span className="font-semibold text-ink">{formatARS(expense.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lb-card">
        <h2 className="text-h2 mb-3 font-display uppercase tracking-wide text-success">
          Objetivos de ahorro
        </h2>
        <ul className="flex flex-col gap-4">
          {demoGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            return (
              <li key={goal.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{goal.title}</span>
                  <span className="text-meta text-ink-faint">
                    {formatARS(goal.current)} / {formatARS(goal.target)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: goal.color }}
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
