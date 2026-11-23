"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Circle, CopyPlus, FlaskConical, PiggyBank, Plus } from "lucide-react";
import type { Budget, Expense, ExpenseCategory, ExpenseStatus, FamilyEvent, Income, IncomeSource, IncomeStatus, Member, PaymentMethod, SavingsGoal } from "@/lib/types";
import { BudgetsPanel } from "./BudgetsPanel";
import { RecurringBills, type BillRow } from "./RecurringBills";
import {
  addToGoal,
  confirmDraftMonth,
  copyFixedExpenses,
  deleteExpense,
  deleteGoal,
  deleteIncome,
  saveExpense,
  saveGoal,
  saveIncome,
  setExpenseStatus,
} from "@/app/actions/finance";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS, relativeDayLabel, todayAR } from "@/lib/format";

import { EXPENSE_CATEGORIES, INCOME_SOURCES, PAYMENT_METHODS } from "@/lib/labels";
import { EmptyAction } from "@/components/ui/EmptyAction";

type Tab = "gastos" | "ingresos" | "ahorro" | "topes";

export function FinanceView({
  incomes,
  expenses,
  goals,
  budgets,
  events = [],
  members,
  currentMemberId,
  monthLabel,
  month,
  isFuture = false,
  isPast = false,
  bills = [],
  prevFixed = null,
}: {
  incomes: Income[];
  expenses: Expense[];
  goals: SavingsGoal[];
  budgets: Budget[];
  events?: Pick<FamilyEvent, "id" | "title">[];
  members: Member[];
  currentMemberId: string | null;
  monthLabel: string;
  month?: string;
  isFuture?: boolean;
  isPast?: boolean;
  bills?: BillRow[];
  // Gastos fijos del mes anterior, para traerlos a este mes como pendientes con un toque.
  prevFixed?: { month: string; label: string; count: number } | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("gastos");
  const [filter, setFilter] = useState<string>("all");
  const [confirming, setConfirming] = useState(false);
  const [toggling, startToggle] = useTransition();
  const [copying, setCopying] = useState(false);
  const parents = members.filter((m) => !m.is_child);
  const draftCount = incomes.filter((i) => i.is_draft).length + expenses.filter((e) => e.is_draft).length;

  const expenseSheet = useSheet<Expense>();
  const incomeSheet = useSheet<Income>();
  const goalSheet = useSheet<SavingsGoal>();

  const visibleIncomes = useMemo(
    () => incomes.filter((i) => filter === "all" || i.member_id === filter),
    [incomes, filter]
  );
  // Primero lo que falta pagar (lo que vence antes, arriba); después lo pagado, lo último primero.
  const visibleExpenses = useMemo(
    () =>
      expenses
        .filter((e) => filter === "all" || e.paid_by === filter)
        .sort((a, b) =>
          a.status !== b.status ? (a.status === "pendiente" ? -1 : 1) : a.status === "pendiente" ? a.spent_at.localeCompare(b.spent_at) : b.spent_at.localeCompare(a.spent_at)
        ),
    [expenses, filter]
  );
  const totalIn = visibleIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalOut = visibleExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIn - totalOut;
  const pendingExpenses = visibleExpenses.filter((e) => e.status === "pendiente");
  const pendingOut = pendingExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const pendingIn = visibleIncomes.filter((i) => i.status === "por_cobrar").reduce((s, i) => s + Number(i.amount), 0);
  const hasFixed = expenses.some((e) => e.is_fixed);

  const perPerson = parents.map((p) => {
    const inc = incomes.filter((i) => i.member_id === p.id).reduce((s, i) => s + Number(i.amount), 0);
    const out = expenses.filter((e) => e.paid_by === p.id).reduce((s, e) => s + Number(e.amount), 0);
    return { member: p, inc, out, balance: inc - out };
  });

  function submitExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    expenseSheet.run(() =>
      saveExpense({
        id: expenseSheet.editing?.id,
        description: f.str("description"),
        amount: f.str("amount"),
        category: f.str("category") as ExpenseCategory,
        paid_by: f.opt("paid_by"),
        spent_at: f.str("spent_at"),
        is_fixed: f.bool("is_fixed"),
        event_id: f.opt("event_id"),
        is_draft: expenseSheet.editing ? expenseSheet.editing.is_draft : isFuture,
        status: f.str("status") as ExpenseStatus,
        payment_method: f.opt("payment_method") as PaymentMethod | null,
        notes: f.opt("notes"),
      })
    );
  }

  function submitIncome(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    incomeSheet.run(() =>
      saveIncome({
        id: incomeSheet.editing?.id,
        description: f.str("description"),
        amount: f.str("amount"),
        source: f.str("source") as IncomeSource,
        member_id: f.opt("member_id"),
        received_at: f.str("received_at"),
        is_recurring: f.bool("is_recurring"),
        is_draft: incomeSheet.editing ? incomeSheet.editing.is_draft : isFuture,
        status: f.str("status") as IncomeStatus,
        notes: f.opt("notes"),
      })
    );
  }

  function submitGoal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    goalSheet.run(() =>
      saveGoal({
        id: goalSheet.editing?.id,
        title: f.str("title"),
        target_amount: f.str("target_amount"),
        current_amount: f.str("current_amount") || 0,
        target_date: f.opt("target_date"),
        member_id: f.opt("member_id"),
      })
    );
  }

  function submitContribution(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    if (!goalSheet.editing) return;
    goalSheet.run(() => addToGoal(goalSheet.editing!.id, f.str("contribution")));
  }

  const openForTab = () => {
    if (tab === "gastos") expenseSheet.openNew();
    else if (tab === "ingresos") incomeSheet.openNew();
    else goalSheet.openNew();
  };

  return (
    <div className="flex flex-col gap-5">
      {isFuture && (
        <section className="lb-card flex items-start gap-3 !bg-info-soft">
          <FlaskConical size={20} className="mt-0.5 shrink-0 text-info" />
          <div>
            <p className="font-display font-semibold text-ink">Modo borrador</p>
            <p className="text-body text-ink-soft">
              Es {monthLabel} todavía no llegó: lo que cargues acá es una hipótesis, no cuenta como real hasta que confirmes el mes (o hasta
              que llegue y sigas cargando lo que va pasando de verdad).
            </p>
          </div>
        </section>
      )}
      {!isFuture && draftCount > 0 && (
        <section className="lb-card flex items-center gap-3 !bg-amber-soft">
          <FlaskConical size={20} className="shrink-0 text-amber" />
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-ink">
              {draftCount} {draftCount === 1 ? "movimiento borrador" : "movimientos borrador"}
            </p>
            <p className="text-meta text-ink-soft">Confirmalos cuando esta cuenta sea la definitiva de {monthLabel}.</p>
          </div>
          <button
            type="button"
            disabled={confirming || !month}
            onClick={() => {
              if (!month) return;
              setConfirming(true);
              const to = new Date(`${month}T12:00:00-03:00`);
              const toStr = new Date(to.getFullYear(), to.getMonth() + 1, 0).toISOString().slice(0, 10);
              confirmDraftMonth(month, toStr)
                .then(() => router.refresh())
                .finally(() => setConfirming(false));
            }}
            className="lb-btn shrink-0 !px-3 !py-2 text-sm disabled:opacity-50"
          >
            {confirming ? "Confirmando…" : "Confirmar mes"}
          </button>
        </section>
      )}

      {/* Filtro por persona */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} color="var(--color-familia)">
          Los dos
        </FilterChip>
        {parents.map((p) => (
          <FilterChip key={p.id} active={filter === p.id} onClick={() => setFilter(p.id)} color={p.color}>
            {p.name}
          </FilterChip>
        ))}
      </div>

      {/* Resumen */}
      <section className="lb-card">
        <p className="text-label font-display uppercase text-ink-ghost">
          {isFuture ? "Saldo hipotético de" : "Saldo de"} {monthLabel}
          {isPast && " · cerrado"}
        </p>
        <p className={`text-display font-display font-bold ${balance < 0 ? "text-danger" : "text-ink"}`}>
          {formatARS(balance)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-success-soft p-3">
            <p className="flex items-center gap-1 text-meta font-semibold text-success">
              <ArrowUpCircle size={13} /> Ingresos
            </p>
            <p className="font-display text-lg font-bold text-ink">{formatARS(totalIn)}</p>
          </div>
          <div className="rounded-md bg-coral-soft p-3">
            <p className="flex items-center gap-1 text-meta font-semibold text-coral">
              <ArrowDownCircle size={13} /> Gastos
            </p>
            <p className="font-display text-lg font-bold text-ink">{formatARS(totalOut)}</p>
          </div>
        </div>
        {(pendingOut > 0 || pendingIn > 0) && (
          <p className="mt-2 text-meta text-ink-soft">
            {pendingOut > 0 && (
              <>
                Falta pagar <span className="font-semibold text-amber">{formatARS(pendingOut)}</span> ({pendingExpenses.length}{" "}
                {pendingExpenses.length === 1 ? "cosa" : "cosas"})
              </>
            )}
            {pendingOut > 0 && pendingIn > 0 && " · "}
            {pendingIn > 0 && (
              <>
                falta cobrar <span className="font-semibold text-success">{formatARS(pendingIn)}</span>
              </>
            )}
          </p>
        )}
        {filter === "all" && perPerson.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
            {perPerson.map(({ member, inc, out, balance: b }) => (
              <li key={member.id} className="flex items-center justify-between text-sm">
                <MemberChip member={member} />
                <span className="text-meta text-ink-faint">
                  +{formatARS(inc)} · −{formatARS(out)}
                </span>
                <span className={`font-semibold ${b < 0 ? "text-danger" : "text-ink"}`}>{formatARS(b)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {month && (
        <RecurringBills bills={bills} month={month} monthLabel={monthLabel} members={members} currentMemberId={currentMemberId} />
      )}

      {/* Tabs */}
      <div className="flex rounded-md bg-line/60 p-1">
        {(["gastos", "ingresos", "ahorro", "topes"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-sm text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-surface text-ink shadow-soft" : "text-ink-faint"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Gastos */}
      {tab === "gastos" && (
        <ul className="flex flex-col gap-2">
          {prevFixed && prevFixed.count > 0 && !hasFixed && month && (
            <li>
              <button
                type="button"
                disabled={copying}
                onClick={() => {
                  setCopying(true);
                  copyFixedExpenses(prevFixed.month, month)
                    .then(() => router.refresh())
                    .finally(() => setCopying(false));
                }}
                className="lb-card flex w-full items-center gap-3 !bg-amber-soft text-left disabled:opacity-60"
              >
                <CopyPlus size={20} className="shrink-0 text-amber" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold text-ink">
                    {copying ? "Trayendo…" : `Traer los ${prevFixed.count} gastos fijos de ${prevFixed.label}`}
                  </span>
                  <span className="block text-meta text-ink-soft">Alquiler, servicios, cuotas… Quedan como pendientes para ir marcándolos.</span>
                </span>
              </button>
            </li>
          )}
          {visibleExpenses.length === 0 && (
            <li className="flex flex-col gap-2">
              <p className="font-accent text-2xl text-ink-faint">Ningún gasto cargado este mes.</p>
              <EmptyAction label="Anotar un gasto" onClick={expenseSheet.openNew} />
            </li>
          )}
          {visibleExpenses.map((ex) => {
            const pending = ex.status === "pendiente";
            return (
              <li key={ex.id} className="lb-card flex items-center gap-1 !p-0">
                <button
                  type="button"
                  disabled={toggling}
                  aria-label={pending ? `Marcar “${ex.description}” como pagado` : `Volver “${ex.description}” a pendiente`}
                  onClick={() =>
                    startToggle(async () => {
                      await setExpenseStatus(ex.id, pending ? "pagado" : "pendiente");
                      router.refresh();
                    })
                  }
                  className="flex h-14 w-12 shrink-0 items-center justify-center"
                >
                  {pending ? <Circle size={22} className="text-amber" /> : <CheckCircle2 size={22} className="text-success" />}
                </button>
                <button type="button" onClick={() => expenseSheet.openEdit(ex)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-item font-medium text-ink">
                      {ex.description}
                      {pending && <span className="lb-chip !bg-amber-soft !text-amber">pendiente</span>}
                      {ex.is_draft && <span className="lb-chip !bg-info-soft !text-info">borrador</span>}
                    </p>
                    <p className="text-meta text-ink-faint">
                      {relativeDayLabel(ex.spent_at)} · {EXPENSE_CATEGORIES[ex.category] ?? ex.category}
                      {ex.payment_method ? ` · ${PAYMENT_METHODS[ex.payment_method]}` : ""}
                      {ex.is_fixed ? " · fijo" : ""}
                    </p>
                    {ex.notes && <p className="mt-0.5 line-clamp-2 text-meta text-ink-soft">{ex.notes}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`font-display font-bold ${pending ? "text-ink-soft" : "text-ink"}`}>−{formatARS(Number(ex.amount))}</span>
                    <MemberChip member={memberById(members, ex.paid_by)} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Ingresos */}
      {tab === "ingresos" && (
        <ul className="flex flex-col gap-2">
          {visibleIncomes.length === 0 && (
            <li className="flex flex-col gap-2">
              <p className="font-accent text-2xl text-ink-faint">Sin ingresos cargados este mes.</p>
              <EmptyAction label="Sumar un ingreso" onClick={incomeSheet.openNew} />
            </li>
          )}
          {visibleIncomes.map((inc) => (
            <li key={inc.id}>
              <button
                type="button"
                onClick={() => incomeSheet.openEdit(inc)}
                className="lb-card flex w-full items-center gap-3 !p-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-item font-medium text-ink">
                    {inc.description}
                    {inc.status === "por_cobrar" && <span className="lb-chip !bg-amber-soft !text-amber">por cobrar</span>}
                    {inc.is_draft && <span className="lb-chip !bg-info-soft !text-info">borrador</span>}
                  </p>
                  <p className="text-meta text-ink-faint">
                    {relativeDayLabel(inc.received_at)} · {INCOME_SOURCES[inc.source]}
                    {inc.is_recurring ? " · mensual" : ""}
                  </p>
                  {inc.notes && <p className="mt-0.5 line-clamp-2 text-meta text-ink-soft">{inc.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-display font-bold text-success">+{formatARS(Number(inc.amount))}</span>
                  <MemberChip member={memberById(members, inc.member_id)} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Ahorro */}
      {tab === "ahorro" && (
        <ul className="flex flex-col gap-3">
          {goals.length === 0 && (
            <li className="flex flex-col gap-2">
              <p className="font-accent text-2xl text-ink-faint">Todavía no hay objetivos de ahorro. ¿Un auto? ¿Las vacaciones?</p>
              <EmptyAction label="Crear un objetivo" onClick={goalSheet.openNew} />
            </li>
          )}
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100));
            return (
              <li key={g.id}>
                <button type="button" onClick={() => goalSheet.openEdit(g)} className="lb-card w-full text-left">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-item font-medium text-ink">
                      <PiggyBank size={16} className="text-success" /> {g.title}
                    </span>
                    <span className="font-display text-sm font-bold text-success">{pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-meta text-ink-faint">
                    <span>
                      {formatARS(Number(g.current_amount))} de {formatARS(Number(g.target_amount))}
                    </span>
                    <MemberChip member={memberById(members, g.member_id)} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Topes por categoría */}
      {tab === "topes" && <BudgetsPanel budgets={budgets} expenses={expenses} />}

      {tab !== "topes" && <Fab onClick={openForTab} label="Agregar" />}

      {/* Sheet: gasto */}
      <BottomSheet
        open={expenseSheet.open}
        onClose={expenseSheet.close}
        title={expenseSheet.editing ? "Editar gasto" : "Nuevo gasto"}
      >
        <form onSubmit={submitExpense} className="flex flex-col gap-4">
          <Field label="Qué es">
            <Input name="description" required autoFocus defaultValue={expenseSheet.editing?.description ?? ""} placeholder="Alquiler, luz, súper, nafta…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto ($)">
              <Input name="amount" type="number" inputMode="decimal" step="any" min="1" required defaultValue={expenseSheet.editing?.amount ?? ""} placeholder="0" />
            </Field>
            <Field label="Categoría">
              <Select name="category" defaultValue={expenseSheet.editing?.category ?? "super"}>
                {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {EXPENSE_CATEGORIES[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Segmented
            name="status"
            label="¿Ya está pagado?"
            defaultValue={expenseSheet.editing?.status ?? (isFuture ? "pendiente" : "pagado")}
            options={[
              { value: "pagado", label: "Pagado" },
              { value: "pendiente", label: "Pendiente" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quién paga">
              <MemberSelect name="paid_by" members={parents} defaultValue={expenseSheet.editing?.paid_by ?? currentMemberId ?? ""} />
            </Field>
            <Field label="Cuándo">
              <Input name="spent_at" type="date" required defaultValue={expenseSheet.editing?.spent_at ?? (isFuture && month ? month : todayAR())} />
            </Field>
          </div>
          <Field label="Cómo se paga">
            <Select name="payment_method" defaultValue={expenseSheet.editing?.payment_method ?? ""}>
              <option value="">Sin definir</option>
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((k) => (
                <option key={k} value={k}>
                  {PAYMENT_METHODS[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Detalle (opcional)">
            <Textarea name="notes" rows={2} defaultValue={expenseSheet.editing?.notes ?? ""} placeholder="Alias o CBU, nro. de cliente, qué incluye, a quién se le dio…" />
          </Field>
          {events.length > 0 && (
            <Field label="Es para un evento (opcional)">
              <Select name="event_id" defaultValue={expenseSheet.editing?.event_id ?? ""}>
                <option value="">No</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input type="checkbox" name="is_fixed" defaultChecked={expenseSheet.editing?.is_fixed ?? false} className="h-5 w-5 accent-coral" />
            Es un gasto fijo mensual (alquiler, servicios, cuota)
          </label>
          {expenseSheet.error && <p className="text-sm text-danger">{expenseSheet.error}</p>}
          <SubmitRow
            saving={expenseSheet.saving}
            submitLabel="Listo, anotado"
            onDelete={expenseSheet.editing ? () => expenseSheet.remove(() => deleteExpense(expenseSheet.editing!.id), `el gasto “${expenseSheet.editing!.description}”`) : undefined}
          />
        </form>
      </BottomSheet>

      {/* Sheet: ingreso */}
      <BottomSheet
        open={incomeSheet.open}
        onClose={incomeSheet.close}
        title={incomeSheet.editing ? "Editar ingreso" : "Nuevo ingreso"}
      >
        <form onSubmit={submitIncome} className="flex flex-col gap-4">
          <Field label="De qué es">
            <Input name="description" required autoFocus defaultValue={incomeSheet.editing?.description ?? ""} placeholder="Sueldo de septiembre, proyecto X…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto ($)">
              <Input name="amount" type="number" inputMode="decimal" step="any" min="1" required defaultValue={incomeSheet.editing?.amount ?? ""} placeholder="0" />
            </Field>
            <Field label="Origen">
              <Select name="source" defaultValue={incomeSheet.editing?.source ?? "sueldo"}>
                {(Object.keys(INCOME_SOURCES) as IncomeSource[]).map((k) => (
                  <option key={k} value={k}>
                    {INCOME_SOURCES[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Segmented
            name="status"
            label="¿Ya se cobró?"
            defaultValue={incomeSheet.editing?.status ?? (isFuture ? "por_cobrar" : "cobrado")}
            options={[
              { value: "cobrado", label: "Cobrado" },
              { value: "por_cobrar", label: "Por cobrar" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="De quién">
              <MemberSelect name="member_id" members={parents} allowNone={false} defaultValue={incomeSheet.editing?.member_id ?? currentMemberId ?? parents[0]?.id} />
            </Field>
            <Field label="Cuándo">
              <Input name="received_at" type="date" required defaultValue={incomeSheet.editing?.received_at ?? (isFuture && month ? month : todayAR())} />
            </Field>
          </div>
          <Field label="Detalle (opcional)">
            <Textarea name="notes" rows={2} defaultValue={incomeSheet.editing?.notes ?? ""} placeholder="Aguinaldo incluido, a qué cuenta entra…" />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input type="checkbox" name="is_recurring" defaultChecked={incomeSheet.editing?.is_recurring ?? false} className="h-5 w-5 accent-coral" />
            Se repite todos los meses
          </label>
          {incomeSheet.error && <p className="text-sm text-danger">{incomeSheet.error}</p>}
          <SubmitRow
            saving={incomeSheet.saving}
            onDelete={incomeSheet.editing ? () => incomeSheet.remove(() => deleteIncome(incomeSheet.editing!.id), `el ingreso “${incomeSheet.editing!.description}”`) : undefined}
          />
        </form>
      </BottomSheet>

      {/* Sheet: objetivo de ahorro */}
      <BottomSheet
        open={goalSheet.open}
        onClose={goalSheet.close}
        title={goalSheet.editing ? "Objetivo de ahorro" : "Nuevo objetivo"}
      >
        {goalSheet.editing && (
          <form onSubmit={submitContribution} className="mb-5 flex items-end gap-3 rounded-card bg-success-soft p-3">
            <Field label="Sumar un aporte ($)">
              <Input name="contribution" type="number" inputMode="decimal" step="any" min="1" required placeholder="0" />
            </Field>
            <button type="submit" disabled={goalSheet.saving} className="lb-btn min-h-11 !bg-success !shadow-none">
              <Plus size={18} />
            </button>
          </form>
        )}
        <form onSubmit={submitGoal} className="flex flex-col gap-4">
          <Field label="Para qué ahorran">
            <Input name="title" required autoFocus={!goalSheet.editing} defaultValue={goalSheet.editing?.title ?? ""} placeholder="Auto, casa, vacaciones…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta ($)">
              <Input name="target_amount" type="number" inputMode="decimal" step="any" min="1" required defaultValue={goalSheet.editing?.target_amount ?? ""} />
            </Field>
            <Field label="Ya ahorrado ($)">
              <Input name="current_amount" type="number" inputMode="decimal" step="any" min="0" defaultValue={goalSheet.editing?.current_amount ?? 0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="De quién">
              <MemberSelect name="member_id" members={parents} defaultValue={goalSheet.editing?.member_id ?? ""} />
            </Field>
            <Field label="Fecha objetivo (opcional)">
              <Input name="target_date" type="date" defaultValue={goalSheet.editing?.target_date ?? ""} />
            </Field>
          </div>
          {goalSheet.error && <p className="text-sm text-danger">{goalSheet.error}</p>}
          <SubmitRow
            saving={goalSheet.saving}
            onDelete={goalSheet.editing ? () => goalSheet.remove(() => deleteGoal(goalSheet.editing!.id), `la meta “${goalSheet.editing!.title}”`) : undefined}
          />
        </form>
      </BottomSheet>
    </div>
  );
}

// Dos opciones excluyentes (pagado / pendiente) como botones grandes, cómodos con el pulgar.
function Segmented({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-label font-bold uppercase tracking-wider text-ink-ghost">{label}</legend>
      <div className="flex rounded-md bg-line/60 p-1">
        {options.map((o) => (
          <label key={o.value} className="flex-1">
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" />
            <span className="flex min-h-10 cursor-pointer items-center justify-center rounded-sm text-sm font-semibold text-ink-faint transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-soft peer-focus-visible:ring-2 peer-focus-visible:ring-coral">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lb-chip min-h-9 border-[1.5px] px-3 transition-colors"
      style={
        active
          ? { backgroundColor: color, borderColor: color, color: "#fff" }
          : { backgroundColor: "transparent", borderColor: "var(--color-line)", color: "var(--color-ink-soft)" }
      }
    >
      {children}
    </button>
  );
}
