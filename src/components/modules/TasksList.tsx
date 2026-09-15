"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import type { Member, Task } from "@/lib/types";
import { deleteTask, saveTask, toggleTask } from "@/app/actions/tasks";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, MemberSelect, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";

export function TasksList({
  tasks,
  members,
  currentMemberId,
  date,
}: {
  tasks: Task[];
  members: Member[];
  currentMemberId: string | null;
  date: string;
}) {
  const router = useRouter();
  const sheet = useSheet<Task>();
  const [pending, setPending] = useState<string | null>(null);

  async function onToggle(task: Task) {
    setPending(task.id);
    try {
      await toggleTask(task.id, !task.done);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveTask({
        id: sheet.editing?.id,
        title: f.str("title"),
        assigned_to: f.opt("assigned_to"),
        due_date: f.str("due_date"),
        notes: f.opt("notes"),
      })
    );
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <section className="lb-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
          <CheckCircle2 size={16} /> Tareas de hoy
        </h2>
        <button
          type="button"
          onClick={sheet.openNew}
          className="flex h-9 items-center gap-1 rounded-full bg-amber-soft px-3 text-xs font-semibold text-[#8A6A2E]"
        >
          <Plus size={14} /> Nueva
        </button>
      </div>

      {tasks.length === 0 && (
        <p className="font-accent text-2xl text-ink-faint">Día tranquilo por acá. Disfrútenlo.</p>
      )}

      <ul className="flex flex-col gap-1">
        {[...open, ...done].map((task) => {
          const member = memberById(members, task.assigned_to);
          return (
            <li key={task.id} className="flex min-h-11 items-center gap-3 text-item">
              <button
                type="button"
                aria-label={task.done ? "Marcar pendiente" : "Marcar hecha"}
                disabled={pending === task.id}
                onClick={() => onToggle(task)}
                className="flex h-11 w-8 shrink-0 items-center justify-start"
              >
                {task.done ? (
                  <CheckCircle2 size={20} className="text-success" />
                ) : (
                  <Circle size={20} className="text-line" />
                )}
              </button>
              <button
                type="button"
                onClick={() => sheet.openEdit(task)}
                className={`min-h-11 flex-1 text-left ${task.done ? "text-ink-ghost line-through" : "text-ink"}`}
              >
                {task.title}
              </button>
              <MemberChip member={member} />
            </li>
          );
        })}
      </ul>

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? "Editar tarea" : "Nueva tarea"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Qué hay que hacer">
            <Input name="title" required autoFocus defaultValue={sheet.editing?.title ?? ""} placeholder="Pagar expensas" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Para quién">
              <MemberSelect
                name="assigned_to"
                members={members}
                defaultValue={sheet.editing?.assigned_to ?? currentMemberId ?? ""}
              />
            </Field>
            <Field label="Fecha">
              <Input name="due_date" type="date" required defaultValue={sheet.editing?.due_date ?? date} />
            </Field>
          </div>
          <Field label="Notas (opcional)">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            onDelete={sheet.editing ? () => sheet.run(() => deleteTask(sheet.editing!.id)) : undefined}
          />
        </form>
      </BottomSheet>
    </section>
  );
}
