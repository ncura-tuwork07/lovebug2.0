"use client";

import { useState, type FormEvent, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Pause, Receipt } from "lucide-react";
import type { BillCycle, Member, Reminder } from "@/lib/types";
import { markBillPaid, setBillCycleStatus, unmarkBillPaid } from "@/app/actions/bills";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, MemberSelect, SubmitRow } from "@/components/ui/Field";
import { fd } from "@/components/ui/useSheet";
import { formatARS, formatDay, todayAR } from "@/lib/format";
import { REMINDER_CATEGORIES } from "./RemindersView";

export type BillRow = { reminder: Reminder; cycle: BillCycle | null };

// Cuentas fijas del mes (colegio, club, gimnasio, luz, alquiler…): para cada una, elegís si la
// vas a pagar este mes, si la pausás (no se paga, pero sigue apareciendo el mes que viene) o si
// ya la pagaste. El vencimiento en sí (con su fecha y aviso) se sigue editando desde Vencimientos.
export function RecurringBills({
  bills,
  month,
  monthLabel,
  members,
  currentMemberId,
}: {
  bills: BillRow[];
  month: string;
  monthLabel: string;
  members: Member[];
  currentMemberId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<BillRow | null>(null);

  if (bills.length === 0) return null;

  const parents = members.filter((m) => !m.is_child);
  const pending = bills.filter((b) => (b.cycle?.status ?? "pendiente") === "pendiente");
  const totalPending = pending.reduce((s, b) => s + Number(b.reminder.amount ?? 0), 0);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo falló.");
    } finally {
      setBusy(null);
    }
  }

  function submitPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paying) return;
    const f = fd(e.currentTarget);
    run(`pay-${paying.reminder.id}`, async () => {
      await markBillPaid({ reminderId: paying.reminder.id, month, amount: f.str("amount"), paidBy: f.opt("paid_by"), spentAt: f.str("spent_at") });
      setPaying(null);
    });
  }

  return (
    <section className="lb-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="lb-tint text-h2 flex items-center gap-2 font-display uppercase tracking-wide" style={{ "--tint": "var(--color-ariana)" } as CSSProperties}>
          <CalendarClock size={16} /> Cuentas de {monthLabel}
        </h2>
        {totalPending > 0 && <span className="text-meta font-semibold text-ink-faint">Faltan {formatARS(totalPending)}</span>}
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {bills.map(({ reminder, cycle }) => {
          const status = cycle?.status ?? "pendiente";
          return (
            <li key={reminder.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-item font-medium text-ink">{reminder.title}</p>
                <p className="text-meta text-ink-faint">
                  {REMINDER_CATEGORIES[reminder.category]}
                  {reminder.amount ? ` · ${formatARS(Number(reminder.amount))} estimado` : ""}
                  {status === "pagada" && cycle?.amount ? ` · pagaste ${formatARS(Number(cycle.amount))}` : ""}
                  {reminder.repeat_until ? ` · hasta ${formatDay(reminder.repeat_until, "MMM yyyy")}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <StatusButton
                  active={status === "pendiente"}
                  disabled={busy !== null}
                  onClick={() => run(`skip-${reminder.id}`, () => setBillCycleStatus(reminder.id, month, "pendiente"))}
                  icon={<Check size={13} />}
                  label="Activa"
                  color="var(--color-ariana)"
                />
                <StatusButton
                  active={status === "pausada"}
                  disabled={busy !== null}
                  onClick={() => run(`pause-${reminder.id}`, () => setBillCycleStatus(reminder.id, month, "pausada"))}
                  icon={<Pause size={13} />}
                  label="Pausar"
                  color="var(--color-ink-faint)"
                />
                <StatusButton
                  active={status === "pagada"}
                  disabled={busy !== null}
                  onClick={() => {
                    if (status === "pagada") run(`unpay-${reminder.id}`, () => unmarkBillPaid(reminder.id, month));
                    else setPaying({ reminder, cycle });
                  }}
                  icon={<Receipt size={13} />}
                  label="Pagada"
                  color="var(--color-success)"
                />
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <BottomSheet open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pagaste "${paying.reminder.title}"` : ""}>
        <form onSubmit={submitPay} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto ($)">
              <Input name="amount" type="number" inputMode="decimal" step="any" min="1" required defaultValue={paying?.reminder.amount ?? ""} />
            </Field>
            <Field label="Fecha">
              <Input name="spent_at" type="date" required defaultValue={todayAR()} />
            </Field>
          </div>
          <Field label="Quién pagó">
            <MemberSelect name="paid_by" members={parents} defaultValue={currentMemberId ?? ""} />
          </Field>
          <SubmitRow saving={busy?.startsWith("pay-") ?? false} submitLabel="Guardar en Finanzas" />
        </form>
      </BottomSheet>
    </section>
  );
}

function StatusButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  color,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="flex min-h-9 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
      style={active ? { backgroundColor: color, color: "#fff" } : { backgroundColor: "var(--color-line)", color: "var(--color-ink-soft)" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
