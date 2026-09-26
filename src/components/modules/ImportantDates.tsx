"use client";

import { type FormEvent } from "react";
import Link from "next/link";
import { Cake, Heart, Star } from "lucide-react";
import type { ImportantDate, Member } from "@/lib/types";
import { deleteImportantDate, saveImportantDate } from "@/app/actions/reminders";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { daysUntilLabel, type Upcoming } from "@/lib/dates";
import { formatDay, todayAR } from "@/lib/format";

export const KIND_ICON = { cumple: Cake, aniversario: Heart, otro: Star };

// Cumples, aniversarios y fechas que se repiten cada año. Los cumples de la familia y del Círculo
// salen de sus perfiles (se editan ahí); el resto se carga acá.
export function ImportantDates({ upcoming, dates, members }: { upcoming: Upcoming[]; dates: ImportantDate[]; members: Member[] }) {
  const sheet = useSheet<ImportantDate>();
  const today = todayAR();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveImportantDate({
        id: sheet.editing?.id,
        title: f.str("title"),
        date: f.str("date"),
        kind: f.str("kind") as "cumple" | "aniversario" | "otro",
        member_id: f.opt("member_id"),
        remind_days_before: f.num("remind_days_before"),
        gift_ideas: f.opt("gift_ideas"),
      })
    );
  }

  const editing = sheet.editing;
  const editingValue = editing
    ? `${editing.year ?? today.slice(0, 4)}-${String(editing.month).padStart(2, "0")}-${String(editing.day).padStart(2, "0")}`
    : today;

  return (
    <>
      {upcoming.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">Cargá cumpleaños, el aniversario, y avisamos con tiempo para el regalo.</p>
      )}
      <ul className="flex flex-col gap-2">
        {upcoming.map((u) => {
          const Icon = KIND_ICON[u.kind];
          const member = memberById(members, u.member_id);
          const content = (
            <>
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
                  {u.source === "member" ? " · desde su perfil" : u.source === "contact" ? " · desde el Círculo" : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`text-sm font-semibold ${u.daysUntil <= u.remind_days_before ? "text-coral" : "text-ink-faint"}`}>
                  {daysUntilLabel(u.daysUntil)}
                </span>
                {member && <MemberChip member={member} />}
              </div>
            </>
          );
          const cls = "lb-card flex w-full items-center gap-3 !p-3 text-left";
          const own = u.source === "date" ? dates.find((d) => d.id === u.id) : null;
          return (
            <li key={u.id}>
              {own ? (
                <button type="button" onClick={() => sheet.openEdit(own)} className={cls}>
                  {content}
                </button>
              ) : (
                <Link href={u.source === "member" ? `/familia/${u.member_id}` : "/circulo"} className={cls}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <Fab onClick={sheet.openNew} label="Nueva fecha importante" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title={editing ? "Editar fecha" : "Nueva fecha importante"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Qué se celebra">
            <Input name="title" required autoFocus defaultValue={editing?.title ?? ""} placeholder="Aniversario, cumple de la abuela…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" hint="El año es para calcular cuántos cumple.">
              <Input name="date" type="date" required defaultValue={editingValue} />
            </Field>
            <Field label="Tipo">
              <Select name="kind" defaultValue={editing?.kind ?? "cumple"}>
                <option value="cumple">Cumpleaños</option>
                <option value="aniversario">Aniversario</option>
                <option value="otro">Otro</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="De quién">
              <MemberSelect name="member_id" members={members} noneLabel="Alguien más" defaultValue={editing?.member_id ?? ""} />
            </Field>
            <Field label="Avisar con">
              <Select name="remind_days_before" defaultValue={String(editing?.remind_days_before ?? 7)}>
                {[1, 3, 7, 14, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} día{n === 1 ? "" : "s"} antes
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Ideas de regalo (opcional)">
            <Textarea name="gift_ideas" defaultValue={editing?.gift_ideas ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} onDelete={editing ? () => sheet.remove(() => deleteImportantDate(editing.id), `“${editing.title}”`) : undefined} />
        </form>
      </BottomSheet>
    </>
  );
}
