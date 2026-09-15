"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Cake, CheckCircle2, Circle, Gift, Heart, Star } from "lucide-react";
import type { ImportantDate, Member, Reminder, ReminderCategory } from "@/lib/types";
import {
  completeReminder,
  deleteImportantDate,
  deleteReminder,
  reopenReminder,
  saveImportantDate,
  saveReminder,
} from "@/app/actions/reminders";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { daysUntilLabel, upcomingDates, type Upcoming } from "@/lib/dates";
import { formatARS, formatDay, todayAR } from "@/lib/format";

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

const KIND_ICON = { cumple: Cake, aniversario: Heart, otro: Star };

export function RemindersView({
  reminders,
  dates,
  members,
  currentMemberId,
}: {
  reminders: Reminder[];
  dates: ImportantDate[];
  members: Member[];
  currentMemberId: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"vencimientos" | "fechas">("vencimientos");
  const [showDone, setShowDone] = useState(false);
  const remSheet = useSheet<Reminder>();
  const dateSheet = useSheet<Upcoming>();
  const today = todayAR();

  const upcoming = upcomingDates(today, dates, members);

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
        notes: f.opt("notes"),
      })
    );
  }

  function submitDate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    const editing = dateSheet.editing?.source === "date" ? dateSheet.editing : null;
    dateSheet.run(() =>
      saveImportantDate({
        id: editing?.id,
        title: f.str("title"),
        date: f.str("date"),
        kind: f.str("kind") as "cumple" | "aniversario" | "otro",
        member_id: f.opt("member_id"),
        remind_days_before: f.num("remind_days_before"),
        gift_ideas: f.opt("gift_ideas"),
      })
    );
  }

  const open = reminders.filter((r) => !r.done).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const done = reminders.filter((r) => r.done);

  const editingDate = dateSheet.editing
    ? dates.find((d) => d.id === dateSheet.editing!.id) ?? null
    : null;
  const editingDateValue = editingDate
    ? `${editingDate.year ?? today.slice(0, 4)}-${String(editingDate.month).padStart(2, "0")}-${String(editingDate.day).padStart(2, "0")}`
    : today;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex rounded-md bg-line/60 p-1">
        {(["vencimientos", "fechas"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-10 flex-1 rounded-sm text-sm font-semibold transition-colors ${
              tab === t ? "bg-surface text-ink shadow-soft" : "text-ink-faint"
            }`}
          >
            {t === "vencimientos" ? "Vencimientos" : "Fechas importantes"}
          </button>
        ))}
      </div>

      {tab === "vencimientos" && (
        <>
          {open.length === 0 && (
            <p className="font-accent text-2xl text-ink-faint">Nada por vencer. Tocá + para cargar el seguro, la luz, la VTV…</p>
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
        </>
      )}

      {tab === "fechas" && (
        <>
          {upcoming.length === 0 && (
            <p className="font-accent text-2xl text-ink-faint">Cargá cumpleaños, el aniversario, y avisamos con tiempo para el regalo.</p>
          )}
          <ul className="flex flex-col gap-2">
            {upcoming.map((u) => {
              const Icon = KIND_ICON[u.kind];
              const member = memberById(members, u.member_id);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => dateSheet.openEdit(u)}
                    className="lb-card flex w-full items-center gap-3 !p-3 text-left"
                    disabled={u.source === "member"}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-item font-medium text-ink">
                        {u.title}
                        {u.turns != null && u.kind !== "otro" ? ` · ${u.turns} ${u.kind === "cumple" ? "años" : "años juntos"}` : ""}
                      </p>
                      <p className="text-meta text-ink-faint">
                        {formatDay(u.next, "EEEE d 'de' MMMM")}
                        {u.gift_ideas ? ` · 🎁 ${u.gift_ideas}` : ""}
                        {u.source === "member" ? " · desde el perfil" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`text-sm font-semibold ${u.daysUntil <= u.remind_days_before ? "text-coral" : "text-ink-faint"}`}>
                        {daysUntilLabel(u.daysUntil)}
                      </span>
                      {member && <MemberChip member={member} />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <Fab onClick={dateSheet.openNew} label="Nueva fecha" />
        </>
      )}

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
              <MemberSelect name="member_id" members={members.filter((m) => m.role === "parent")} defaultValue={remSheet.editing?.member_id ?? currentMemberId ?? ""} />
            </Field>
          </div>
          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={remSheet.editing?.notes ?? ""} />
          </Field>
          {remSheet.error && <p className="text-sm text-danger">{remSheet.error}</p>}
          <SubmitRow saving={remSheet.saving} onDelete={remSheet.editing ? () => remSheet.run(() => deleteReminder(remSheet.editing!.id)) : undefined} />
        </form>
      </BottomSheet>

      {/* Sheet fecha importante */}
      <BottomSheet open={dateSheet.open} onClose={dateSheet.close} title={editingDate ? "Editar fecha" : "Nueva fecha importante"}>
        <form onSubmit={submitDate} className="flex flex-col gap-4">
          <Field label="Qué se celebra">
            <Input name="title" required autoFocus defaultValue={editingDate?.title ?? ""} placeholder="Aniversario, cumple de la abuela…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" hint="El año es para calcular cuántos cumple.">
              <Input name="date" type="date" required defaultValue={editingDateValue} />
            </Field>
            <Field label="Tipo">
              <Select name="kind" defaultValue={editingDate?.kind ?? "cumple"}>
                <option value="cumple">Cumpleaños</option>
                <option value="aniversario">Aniversario</option>
                <option value="otro">Otro</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="De quién">
              <MemberSelect name="member_id" members={members} noneLabel="Alguien más" defaultValue={editingDate?.member_id ?? ""} />
            </Field>
            <Field label="Avisar con">
              <Select name="remind_days_before" defaultValue={String(editingDate?.remind_days_before ?? 7)}>
                {[1, 3, 7, 14, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} día{n === 1 ? "" : "s"} antes
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Ideas de regalo (opcional)">
            <Textarea name="gift_ideas" defaultValue={editingDate?.gift_ideas ?? ""} />
          </Field>
          {dateSheet.error && <p className="text-sm text-danger">{dateSheet.error}</p>}
          <SubmitRow saving={dateSheet.saving} onDelete={editingDate ? () => dateSheet.run(() => deleteImportantDate(editingDate.id)) : undefined} />
        </form>
      </BottomSheet>

      <p className="flex items-center gap-2 text-meta text-ink-faint">
        <BellRing size={12} /> Con los avisos activados (en Más), te llega una notificación cuando algo se acerca.
        <Gift size={12} className="ml-auto" />
      </p>
    </div>
  );
}
