"use client";

import { useState, type FormEvent } from "react";
import { Cake } from "lucide-react";
import type { Member } from "@/lib/types";
import { deleteMember, saveMember } from "@/app/actions/members";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatDay } from "@/lib/format";

const PALETTE = ["#FFB347", "#10B981", "#8B5CF6", "#0EA5A5", "#FF9F43", "#6366F1", "#EF4444", "#F59E0B", "#3B82F6", "#EC4899"];

export function MembersList({ members }: { members: Member[] }) {
  const sheet = useSheet<Member>();
  const [color, setColor] = useState(PALETTE[0]);

  function openNew() {
    setColor(PALETTE[(members.length + 1) % PALETTE.length]);
    sheet.openNew();
  }
  function openEdit(m: Member) {
    setColor(m.color);
    sheet.openEdit(m);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveMember({
        id: sheet.editing?.id,
        name: f.str("name"),
        role: f.str("role") as "parent" | "child",
        color,
        birthday: f.opt("birthday"),
        notes: f.opt("notes"),
      })
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => openEdit(m)} className="lb-card flex w-full items-center gap-3 !p-3 text-left">
              <MemberAvatar member={m} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-item font-medium text-ink">{m.name}</p>
                <p className="flex items-center gap-2 text-meta text-ink-faint">
                  <span>{m.role === "parent" ? "Mamá / papá" : "Hijo/a"}</span>
                  {m.birthday && (
                    <span className="inline-flex items-center gap-1">
                      <Cake size={11} /> {formatDay(m.birthday, "d 'de' MMMM")}
                    </span>
                  )}
                  {m.user_id && <span className="text-info">· con acceso</span>}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Fab onClick={openNew} label="Agregar integrante" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar integrante" : "Nuevo integrante"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input name="name" required autoFocus defaultValue={sheet.editing?.name ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rol">
              <Select name="role" defaultValue={sheet.editing?.role ?? "child"} disabled={!!sheet.editing?.user_id}>
                <option value="child">Hijo/a</option>
                <option value="parent">Mamá / papá</option>
              </Select>
            </Field>
            <Field label="Cumpleaños">
              <Input name="birthday" type="date" defaultValue={sheet.editing?.birthday ?? ""} />
            </Field>
          </div>
          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className="h-9 w-9 rounded-full border-4 transition-transform"
                  style={{ backgroundColor: c, borderColor: color === c ? "var(--color-ink)" : "transparent" }}
                />
              ))}
            </div>
          </Field>
          <Field label="Notas (talles, alergias, colegio…)">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={sheet.editing && !sheet.editing.user_id ? () => sheet.run(() => deleteMember(sheet.editing!.id)) : undefined}
          />
        </form>
      </BottomSheet>
    </>
  );
}
