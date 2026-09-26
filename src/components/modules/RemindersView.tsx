"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CheckCircle2, Circle } from "lucide-react";
import type { Member, Reminder, ReminderCategory } from "@/lib/types";
import { completeReminder, deleteReminder, reopenReminder, saveReminder } from "@/app/actions/reminders";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS, formatDay, todayAR } from "@/lib/format";
import { EmptyAction } from "@/components/ui/EmptyAction";

export const REMINDER_CATEGORIES: Record<ReminderCategory, string> = {
  seguro: "Seguro",
  servicio: "Servicio (luz, gas, internet…)",
  impuesto: "Impuesto / tasa",
  colegio: "Colegio",
  salud: "Salud / obra social",
  auto: "Auto (patente, VTV, service)",
  casa: "Casa (alquiler, expensas)",
  otro: "Otro",
};

// Cumples y fechas importantes viven en el Calendario (pestaña "Fechas importantes").
export function RemindersView({
  reminders,
  members,
  currentMemberId,
}: {
  reminders: Reminder[];
  members: Member[];
  currentMemberId: string | null;
}) {
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);
  const remSheet = useSheet<Reminder>();
  const today = todayAR();

  function submitReminder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    remSheet.run(() =>
      saveReminder({
        id: remSheet.editing?.id,
        title: f.str("title"),
        due_date: f.str("due_date"),
        category: f.str("category") as ReminderCategory,
        amount: f.opt("amount"),
        member_id: f.opt("member_id"),
        notify_days_before: f.num("notify_days_before"),
        repeat: f.str("repeat") as "none" | "monthly" | "yearly",
        repeat_until: f.opt("repeat_until"),
        notes: f.opt("notes"),
      })
    );
  }

  const open = reminders.filter((r) => !r.done).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const done = reminders.filter((r) => r.done);

  return (
    <div className="flex flex-col gap-5">
      {open.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-accent text-2xl text-ink-faint">Nada por vencer. Cargá el seguro, la luz, la VTV… y te avisamos antes.</p>
          <EmptyAction label="Cargar un vencimiento" onClick={remSheet.openNew} />
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {(showDone ? [...open, ...done] : open).map((r) => {
          const days = Math.round((Date.parse(r.due_date) - Date.parse(today)) / 86400000);
          const overdue = !r.done && days < 0;
          const soon = !r.done && days >= 0 && days <= r.notify_days_before;
          return (
            <li key={r.id} className={`lb-card flex items-center gap-2 !p-3 ${r.done ? "opacity-60" : ""}`}>
              <button
                type="button"
                aria-label={r.done ? "Reabrir" : "Marcar pagado"}
                onClick={async () => {
                  await (r.done ? reopenReminder(r.id) : completeReminder(r.id));
                  router.refresh();
                }}
                className="flex h-11 w-9 shrink-0 items-center justify-center"
              >
                {r.done ? <CheckCircle2 size={22} className="text-success" /> : <Circle size={22} className="text-line" />}
              </button>
              <button type="button" onClick={() => remSheet.openEdit(r)} className="min-w-0 flex-1 text-left">
                <p className={`text-item font-medium text-ink ${r.done ? "line-through" : ""}`}>{r.title}</p>
                <p className="text-meta text-ink-faint">
                  {REMINDER_CATEGORIES[r.category]} · {formatDay(r.due_date, "d MMM")}
                  {r.repeat !== "none" ? (r.repeat === "monthly" ? " · mensual" : " · anual") : ""}
                  {r.repeat_until ? ` hasta ${formatDay(r.repeat_until, "MMM yyyy")}` : ""}
                </p>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`text-sm font-semibold ${
                    overdue ? "text-danger" : soon ? "text-amber" : "text-ink-faint"
                  }`}
                >
                  {r.done ? "Listo" : overdue ? `Venció hace ${-days} d` : days === 0 ? "Vence hoy" : `${days} d`}
                </span>
                {r.amount != null && <span className="text-meta text-ink-faint">{formatARS(Number(r.amount))}</span>}
                {r.member_id && <MemberChip member={memberById(members, r.member_id)} />}
              </div>
            </li>
          );
        })}
      </ul>
      {done.length > 0 && (
        <button type="button" onClick={() => setShowDone((v) => !v)} className="min-h-11 text-sm font-semibold text-ink-faint">
          {showDone ? "Ocultar" : "Ver"} {done.length} pagado{done.length === 1 ? "" : "s"}
        </button>
      )}
      <Fab onClick={remSheet.openNew} label="Nuevo vencimiento" />

      {/* Sheet vencimiento */}
      <BottomSheet open={remSheet.open} onClose={remSheet.close} title={remSheet.editing ? "Editar vencimiento" : "Nuevo vencimiento"}>
        <form onSubmit={submitReminder} className="flex flex-col gap-4">
          <Field label="Qué vence">
            <Input name="title" required autoFocus defaultValue={remSheet.editing?.title ?? ""} placeholder="Seguro del auto, luz, VTV…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vence el">
              <Input name="due_date" type="date" required defaultValue={remSheet.editing?.due_date ?? today} />
            </Field>
            <Field label="Categoría">
              <Select name="category" defaultValue={remSheet.editing?.category ?? "servicio"}>
                {(Object.keys(REMINDER_CATEGORIES) as ReminderCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {REMINDER_CATEGORIES[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto (opcional)">
              <Input name="amount" type="number" inputMode="decimal" step="any" min="0" defaultValue={remSheet.editing?.amount ?? ""} placeholder="0" />
            </Field>
            <Field label="Se repite">
              <Select name="repeat" defaultValue={remSheet.editing?.repeat ?? "none"}>
                <option value="none">No</option>
                <option value="monthly">Todos los meses</option>
                <option value="yearly">Todos los años</option>
              </Select>
            </Field>
          </div>
          <Field label="Hasta cuándo (opcional)" hint="Solo si se repite. Ej. el alquiler hasta junio del año que viene. Vacío = para siempre.">
            <Input name="repeat_until" type="date" defaultValue={remSheet.editing?.repeat_until ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Avisar con">
              <Select name="notify_days_before" defaultValue={String(remSheet.editing?.notify_days_before ?? 3)}>
                {[0, 1, 2, 3, 5, 7, 14, 30].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "El mismo día" : `${n} día${n === 1 ? "" : "s"} antes`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Responsable">
              <MemberSelect name="member_id" members={members.filter((m) => !m.is_child)} defaultValue={remSheet.editing?.member_id ?? currentMemberId ?? ""} />
            </Field>
          </div>
          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={remSheet.editing?.notes ?? ""} />
          </Field>
          {remSheet.error && <p className="text-sm text-danger">{remSheet.error}</p>}
          <SubmitRow saving={remSheet.saving} onDelete={remSheet.editing ? () => remSheet.remove(() => deleteReminder(remSheet.editing!.id), `“${remSheet.editing!.title}”`) : undefined} />
        </form>
      </BottomSheet>

      <p className="flex items-center gap-2 text-meta text-ink-faint">
        <BellRing size={12} className="shrink-0" /> Con los avisos activados (en Más), te llega una notificación cuando algo se acerca.
      </p>
    </div>
  );
}
