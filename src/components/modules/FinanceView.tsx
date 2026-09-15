"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowDownCircle, ArrowUpCircle, PiggyBank, Plus } from "lucide-react";
import type { Expense, ExpenseCategory, Income, IncomeSource, Member, SavingsGoal } from "@/lib/types";
import {
  addToGoal,
  deleteExpense,
  deleteGoal,
  deleteIncome,
  saveExpense,
  saveGoal,
  saveIncome,
} from "@/app/actions/finance";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS, relativeDayLabel, todayAR } from "@/lib/format";

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  super: "Supermercado",
  casa: "Casa",
  chicos: "Chicos",
  auto: "Auto / nafta",
  salud: "Salud",
  ocio: "Salidas / ocio",
  ropa: "Ropa",
  servicios: "Servicios",
  alquiler: "Alquiler / expensas",
  educacion: "Colegio / educación",
  otro: "Otro",
};

export const INCOME_SOURCES: Record<IncomeSource, string> = {
  sueldo: "Sueldo",
  freelance: "Freelance / tercerizado",
  proyecto: "Proyecto",
  anses: "ANSES / asignación",
  otro: "Otro",
};

type Tab = "gastos" | "ingresos" | "ahorro";

export function FinanceView({
  incomes,
  expenses,
  goals,
  members,
  currentMemberId,
  monthLabel,
}: {
  incomes: Income[];
  expenses: Expense[];
  goals: SavingsGoal[];
  members: Member[];
  currentMemberId: string | null;
  monthLabel: string;
}) {
  const [tab, setTab] = useState<Tab>("gastos");
  const [filter, setFilter] = useState<string>("all");
  const parents = members.filter((m) => m.role === "parent");

  const expenseSheet = useSheet<Expense>();
  const incomeSheet = useSheet<Income>();
  const goalSheet = useSheet<SavingsGoal>();

  const visibleIncomes = useMemo(
    () => incomes.filter((i) => filter === "all" || i.member_id === filter),
    [incomes, filter]
  );
  const visibleExpenses = useMemo(
    () => expenses.filter((e) => filter === "all" || e.paid_by === filter),
    [expenses, filter]
  );
  const totalIn = visibleIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalOut = visibleExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIn - totalOut;

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
        <p className="text-label font-display uppercase text-ink-ghost">Saldo de {monthLabel}</p>
        <p className={`text-display font-display font-bold ${balance < 0 ? "text-danger" : "text-ink"}`}>
          {formatARS(balance)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-[#E9FAF3] p-3">
            <p className="flex items-center gap-1 text-meta font-semibold text-[#0B7A5E]">
              <ArrowUpCircle size={13} /> Ingresos
            </p>
            <p className="font-display text-lg font-bold text-ink">{formatARS(totalIn)}</p>
          </div>
          <div className="rounded-md bg-coral-soft p-3">
            <p className="flex items-center gap-1 text-meta font-semibold text-[#B23B3F]">
              <ArrowDownCircle size={13} /> Gastos
            </p>
            <p className="font-display text-lg font-bold text-ink">{formatARS(totalOut)}</p>
          </div>
        </div>
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

      {/* Tabs */}
      <div className="flex rounded-md bg-line/60 p-1">
        {(["gastos", "ingresos", "ahorro"] as Tab[]).map((t) => (
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
          {visibleExpenses.length === 0 && (
            <p className="font-accent text-2xl text-ink-faint">Ningún gasto cargado este mes. Tocá + para anotar uno.</p>
          )}
          {visibleExpenses.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => expenseSheet.openEdit(ex)}
                className="lb-card flex w-full items-center gap-3 !p-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-item font-medium text-ink">{ex.description}</p>
                  <p className="text-meta text-ink-faint">
                    {relativeDayLabel(ex.spent_at)} · {EXPENSE_CATEGORIES[ex.category]}
                    {ex.is_fixed ? " · fijo" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-display font-bold text-ink">−{formatARS(Number(ex.amount))}</span>
                  <MemberChip member={memberById(members, ex.paid_by)} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Ingresos */}
      {tab === "ingresos" && (
        <ul className="flex flex-col gap-2">
          {visibleIncomes.length === 0 && (
            <p className="font-accent text-2xl text-ink-faint">Sin ingresos cargados este mes. Tocá + para sumar uno.</p>
          )}
          {visibleIncomes.map((inc) => (
            <li key={inc.id}>
              <button
                type="button"
                onClick={() => incomeSheet.openEdit(inc)}
                className="lb-card flex w-full items-center gap-3 !p-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-item font-medium text-ink">{inc.description}</p>
                  <p className="text-meta text-ink-faint">
                    {relativeDayLabel(inc.received_at)} · {INCOME_SOURCES[inc.source]}
                    {inc.is_recurring ? " · mensual" : ""}
                  </p>
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
            <p className="font-accent text-2xl text-ink-faint">Todavía no hay objetivos de ahorro. ¿Un auto? ¿La casa?</p>
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

      <Fab onClick={openForTab} label="Agregar" />

      {/* Sheet: gasto */}
      <BottomSheet
        open={expenseSheet.open}
        onClose={expenseSheet.close}
        title={expenseSheet.editing ? "Editar gasto" : "Nuevo gasto"}
      >
        <form onSubmit={submitExpense} className="flex flex-col gap-4">
          <Field label="Qué compraste">
            <Input name="description" required autoFocus defaultValue={expenseSheet.editing?.description ?? ""} placeholder="Super, nafta, kiosco…" />
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quién pagó">
              <MemberSelect name="paid_by" members={parents} defaultValue={expenseSheet.editing?.paid_by ?? currentMemberId ?? ""} />
            </Field>
            <Field label="Fecha">
              <Input name="spent_at" type="date" required defaultValue={expenseSheet.editing?.spent_at ?? todayAR()} />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input type="checkbox" name="is_fixed" defaultChecked={expenseSheet.editing?.is_fixed ?? false} className="h-5 w-5 accent-coral" />
            Es un gasto fijo mensual (alquiler, servicios, cuota)
          </label>
          {expenseSheet.error && <p className="text-sm text-danger">{expenseSheet.error}</p>}
          <SubmitRow
            saving={expenseSheet.saving}
            submitLabel="Listo, anotado"
            onDelete={expenseSheet.editing ? () => expenseSheet.run(() => deleteExpense(expenseSheet.editing!.id)) : undefined}
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="De quién">
              <MemberSelect name="member_id" members={parents} allowNone={false} defaultValue={incomeSheet.editing?.member_id ?? currentMemberId ?? parents[0]?.id} />
            </Field>
            <Field label="Fecha">
              <Input name="received_at" type="date" required defaultValue={incomeSheet.editing?.received_at ?? todayAR()} />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input type="checkbox" name="is_recurring" defaultChecked={incomeSheet.editing?.is_recurring ?? false} className="h-5 w-5 accent-coral" />
            Se repite todos los meses
          </label>
          {incomeSheet.error && <p className="text-sm text-danger">{incomeSheet.error}</p>}
          <SubmitRow
            saving={incomeSheet.saving}
            onDelete={incomeSheet.editing ? () => incomeSheet.run(() => deleteIncome(incomeSheet.editing!.id)) : undefined}
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
          <form onSubmit={submitContribution} className="mb-5 flex items-end gap-3 rounded-card bg-[#E9FAF3] p-3">
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
            onDelete={goalSheet.editing ? () => goalSheet.run(() => deleteGoal(goalSheet.editing!.id)) : undefined}
          />
        </form>
      </BottomSheet>
    </div>
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
