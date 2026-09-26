"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Cake, ChevronRight, Star } from "lucide-react";
import type { Member } from "@/lib/types";
import { saveMember } from "@/app/actions/members";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { BoolToggle, Field, Input, RolePicker, SubmitRow } from "@/components/ui/Field";
import { isMinor, ROLE_SUGGESTIONS, shownRole } from "@/lib/roles";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatDay, todayAR } from "@/lib/format";

const PALETTE = ["#FFB347", "#10B981", "#8B5CF6", "#0EA5A5", "#FF9F43", "#6366F1", "#EF4444", "#F59E0B", "#3B82F6", "#EC4899"];

export function MembersList({ members, points }: { members: Member[]; points: Record<string, number> }) {
  const sheet = useSheet<Member>();
  const [color, setColor] = useState(PALETTE[0]);
  const [isChild, setIsChild] = useState(false);

  function openNew() {
    setColor(PALETTE[(members.length + 1) % PALETTE.length]);
    setIsChild(false);
    sheet.openNew();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveMember({
        name: f.str("name"),
        role: f.str("role"),
        is_child: f.bool("is_child"),
        color,
        birthday: f.opt("birthday"),
        notes: null,
      })
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id}>
            <Link href={`/familia/${m.id}`} className="lb-card flex items-center gap-3 !p-3">
              {m.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo_url} alt={m.name} className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <MemberAvatar member={m} size={44} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-item font-medium text-ink">
                  {m.name}
                  {m.nickname && <span className="text-ink-faint"> · {m.nickname}</span>}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-meta text-ink-faint">
                  {shownRole(m.role) && <span>{m.role}</span>}
                  {m.is_child && !m.birthday && <span>Menor</span>}
                  {m.birthday && (
                    <span className="inline-flex items-center gap-1">
                      <Cake size={11} /> {formatDay(m.birthday, "d 'de' MMM")}
                    </span>
                  )}
                  {m.is_child && (
                    <span className="inline-flex items-center gap-1 text-amber">
                      <Star size={11} fill="currentColor" /> {points[m.id] ?? 0}
                    </span>
                  )}
                  {m.user_id && <span className="text-info">con acceso</span>}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-ghost" />
            </Link>
          </li>
        ))}
      </ul>

      <Fab onClick={openNew} label="Agregar integrante" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title="Nuevo integrante">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input name="name" required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Qué es en la familia">
              <RolePicker name="role" options={ROLE_SUGGESTIONS} required />
            </Field>
            <Field label="Cumpleaños">
              <Input
                name="birthday"
                type="date"
                onChange={(e) => {
                  const minor = isMinor(e.target.value, todayAR());
                  if (minor !== null) setIsChild(minor);
                }}
              />
            </Field>
          </div>
          <Field group label="¿Es menor de edad?" hint="Los menores suman puntos y premios, y no aparecen en finanzas ni en el horóscopo. Con el cumple se marca solo.">
            <BoolToggle name="is_child" value={isChild} onChange={setIsChild} falseLabel="No" trueLabel="Sí, es menor" />
          </Field>
          <Field group label="Color" hint="Después completás foto, documentos y el resto desde su perfil.">
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className="h-9 w-9 rounded-full border-4"
                  style={{ backgroundColor: c, borderColor: color === c ? "var(--color-ink)" : "transparent" }}
                />
              ))}
            </div>
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow saving={sheet.saving} submitLabel="Crear" />
        </form>
      </BottomSheet>
    </>
  );
}
