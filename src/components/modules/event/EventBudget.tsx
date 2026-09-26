"use client";

import { useRef, useState, type FormEvent } from "react";
import { Paperclip, Receipt, Wallet } from "lucide-react";
import type { Expense, FamilyEvent, Member } from "@/lib/types";
import { addEventExpense } from "@/app/actions/familyEvents";
import { deleteExpense } from "@/app/actions/finance";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, MemberSelect, SubmitRow } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS, formatDay, todayAR } from "@/lib/format";
import { AddButton, SectionTitle, uploadEventFile, useRun } from "./shared";

export type ExpenseWithReceipt = Expense & { receipt_url: string | null };

export function EventBudget({
  event,
  expenses,
  estimatedExtras,
  members,
  currentMemberId,
  householdId,
}: {
  event: FamilyEvent;
  expenses: ExpenseWithReceipt[];
  estimatedExtras: number;
  members: Member[];
  currentMemberId: string | null;
  householdId: string;
}) {
  const sheet = useSheet<Expense>();
  const { msg, run } = useRun();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const budget = event.budget ? Number(event.budget) : null;
  const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = fd(form);
    const file = fileRef.current?.files?.[0] ?? null;
    sheet.run(async () => {
      const receipt_path = file ? await uploadEventFile(householdId, event.id, "ticket", file) : null;
      await addEventExpense(event.id, {
        description: f.str("description"),
        amount: f.str("amount"),
        paid_by: f.opt("paid_by"),
        spent_at: f.str("spent_at"),
        receipt_path,
      });
      setFileName(null);
    });
  }

  return (
    <section className="lb-card">
      <SectionTitle icon={<Wallet size={16} />} color="var(--color-ariana)" action={<AddButton onClick={sheet.openNew} label="Gasto" />}>
        Presupuesto y gastos
      </SectionTitle>
      {budget ? (
        <>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-track">
            <div className={`h-full rounded-full ${spent > budget ? "bg-danger" : "bg-success"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-meta text-ink-faint">
            {formatARS(spent)} gastados de {formatARS(budget)}
            {spent > budget ? ` · te pasaste ${formatARS(spent - budget)}` : ` · quedan ${formatARS(budget - spent)}`}
          </p>
        </>
      ) : (
        <p className="text-meta text-ink-faint">{formatARS(spent)} gastados hasta ahora. Podés fijar un presupuesto en “Editar datos”.</p>
      )}
      {estimatedExtras > 0 && (
        <p className="mt-1 text-meta text-ink-faint">Compras extra estimadas: {formatARS(estimatedExtras)}.</p>
      )}

      {expenses.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {expenses.map((x) => (
            <li key={x.id} className="flex min-h-11 items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-item text-ink">{x.description}</span>
                <span className="flex items-center gap-2 text-meta text-ink-faint">
                  {formatDay(x.spent_at, "d MMM")}
                  <MemberChip member={memberById(members, x.paid_by)} fallback="" />
                  {x.receipt_url && (
                    <a href={x.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-info">
                      <Receipt size={12} /> ticket
                    </a>
                  )}
                </span>
              </span>
              <span className="shrink-0 font-semibold text-ink">{formatARS(Number(x.amount))}</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Borrar el gasto "${x.description}"?`)) run(x.id, () => deleteExpense(x.id));
                }}
                className="shrink-0 px-1 text-xs font-semibold text-ink-ghost"
              >
                borrar
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-1 text-sm text-ink-soft">{msg}</p>}
      <p className="mt-2 text-meta text-ink-faint">Los gastos del evento también aparecen en Finanzas.</p>

      <BottomSheet open={sheet.open} onClose={sheet.close} title="Cargar gasto del evento">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Qué se compró">
            <Input name="description" required autoFocus placeholder="Bebidas en el súper" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto ($)">
              <Input name="amount" required type="number" inputMode="decimal" step="any" min="0" />
            </Field>
            <Field label="Fecha">
              <Input name="spent_at" type="date" required defaultValue={todayAR()} />
            </Field>
          </div>
          <Field label="Quién pagó">
            <MemberSelect name="paid_by" members={members.filter((m) => !m.is_child)} defaultValue={currentMemberId ?? ""} noneLabel="Plata de la casa" />
          </Field>
          <Field label="Ticket o comprobante (opcional)">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-11 items-center gap-2 rounded-md border-[1.5px] border-dashed border-line px-3 text-sm font-semibold text-ink-soft"
            >
              <Paperclip size={16} /> {fileName ?? "Sacar foto o adjuntar"}
            </button>
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} submitLabel="Guardar gasto" />
        </form>
      </BottomSheet>
    </section>
  );
}
