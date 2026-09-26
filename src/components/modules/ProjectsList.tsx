"use client";

import { useState, type FormEvent, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Horizon, Member, Project } from "@/lib/types";
import { deleteProject, saveProject, setProjectProgress } from "@/app/actions/projects";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatDay } from "@/lib/format";

export const HORIZONS: Record<Horizon, { label: string; color: string }> = {
  today: { label: "Hoy", color: "var(--color-amber)" },
  week: { label: "Esta semana", color: "var(--color-coral)" },
  month: { label: "Este mes", color: "var(--color-info)" },
  quarter: { label: "Próximos 3 meses", color: "var(--color-success)" },
};

export function ProjectsList({
  projects,
  members,
  currentMemberId,
  defaultHorizon = "week",
}: {
  projects: Project[];
  members: Member[];
  currentMemberId: string | null;
  defaultHorizon?: Horizon;
}) {
  const router = useRouter();
  const sheet = useSheet<Project>();
  const [progress, setProgress] = useState(0);
  const [showDone, setShowDone] = useState(false);

  function openNew() {
    setProgress(0);
    sheet.openNew();
  }
  function openEdit(p: Project) {
    setProgress(p.progress);
    sheet.openEdit(p);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveProject({
        id: sheet.editing?.id,
        title: f.str("title"),
        description: f.opt("description"),
        horizon: f.str("horizon") as Horizon,
        progress: f.num("progress"),
        due_date: f.opt("due_date"),
        member_id: f.opt("member_id"),
      })
    );
  }

  async function quickComplete(p: Project) {
    await setProjectProgress(p.id, p.status === "done" ? 0 : 100);
    router.refresh();
  }

  const visible = projects.filter((p) => showDone || p.status !== "done");
  const doneCount = projects.filter((p) => p.status === "done").length;

  return (
    <>
      {(Object.keys(HORIZONS) as Horizon[]).map((h) => {
        const items = visible.filter((p) => p.horizon === h);
        if (items.length === 0) return null;
        return (
          <section key={h} className="lb-card">
            <h2 className="lb-tint text-h2 mb-3 font-display uppercase tracking-wide" style={{ "--tint": HORIZONS[h].color } as CSSProperties}>
              {HORIZONS[h].label}
            </h2>
            <ul className="flex flex-col gap-3">
              {items.map((p) => (
                <li key={p.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-item">
                    <input
                      type="checkbox"
                      aria-label="Completar"
                      checked={p.status === "done"}
                      onChange={() => quickComplete(p)}
                      className="h-5 w-5 shrink-0 accent-success"
                    />
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className={`min-h-9 flex-1 text-left text-ink ${p.status === "done" ? "line-through text-ink-ghost" : ""}`}
                    >
                      {p.title}
                    </button>
                    <MemberChip member={memberById(members, p.member_id)} />
                  </div>
                  <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: HORIZONS[h].color }} />
                  </div>
                  <p className="ml-7 text-meta text-ink-faint">
                    {p.progress}%
                    {p.due_date ? ` · vence ${formatDay(p.due_date, "d MMM")}` : ""}
                    {p.description ? ` · ${p.description}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {visible.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">
          {projects.length === 0 ? "Sin metas todavía. Tocá + y anotá la primera." : "¡Todo tachado! Una menos de la lista."}
        </p>
      )}

      {doneCount > 0 && (
        <button type="button" onClick={() => setShowDone((v) => !v)} className="min-h-11 text-sm font-semibold text-ink-faint">
          {showDone ? "Ocultar" : "Ver"} {doneCount} completada{doneCount === 1 ? "" : "s"}
        </button>
      )}

      <Fab onClick={openNew} label="Nueva meta" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar meta" : "Nueva meta"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Qué se proponen">
            <Input name="title" required autoFocus defaultValue={sheet.editing?.title ?? ""} placeholder="Pintar el living, service del auto…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Para cuándo">
              <Select name="horizon" defaultValue={sheet.editing?.horizon ?? defaultHorizon}>
                {(Object.keys(HORIZONS) as Horizon[]).map((h) => (
                  <option key={h} value={h}>
                    {HORIZONS[h].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Responsable">
              <MemberSelect name="member_id" members={members} defaultValue={sheet.editing?.member_id ?? currentMemberId ?? ""} />
            </Field>
          </div>
          <Field label={`Avance: ${progress}%`}>
            <input
              name="progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="h-11 w-full accent-coral"
            />
          </Field>
          <Field label="Fecha límite (opcional)">
            <Input name="due_date" type="date" defaultValue={sheet.editing?.due_date ?? ""} />
          </Field>
          <Field label="Detalle (opcional)">
            <Textarea name="description" defaultValue={sheet.editing?.description ?? ""} placeholder="Falta comprar la pintura…" />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={sheet.editing ? () => sheet.remove(() => deleteProject(sheet.editing!.id), `“${sheet.editing!.title}”`) : undefined}
          />
        </form>
      </BottomSheet>
    </>
  );
}
