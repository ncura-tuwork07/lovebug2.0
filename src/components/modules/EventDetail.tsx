"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChefHat, Circle, ListChecks, Plus, ShoppingCart, Trash2, Wallet } from "lucide-react";
import type { Expense, FamilyEvent, Member, MenuItem, PantryItem, Recipe, ShoppingItem, Task } from "@/lib/types";
import {
  addEventTask,
  deleteFamilyEvent,
  saveFamilyEvent,
  sendEventMenuToShopping,
  setEventMenu,
  setEventStatus,
} from "@/app/actions/familyEvents";
import { toggleTask } from "@/app/actions/tasks";
import { toggleShoppingItem } from "@/app/actions/shopping";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, MemberSelect, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberChip, memberById } from "@/components/ui/MemberChip";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatARS, formatDay, shortTime, todayAR } from "@/lib/format";
import { daysUntilLabel } from "@/lib/dates";
import { checkPantry, formatQty, mergeIngredients, scaleIngredients } from "@/lib/kitchen";

export function EventDetail({
  event,
  recipes,
  pantry,
  shopping,
  tasks,
  expenses,
  members,
  currentMemberId,
}: {
  event: FamilyEvent;
  recipes: Recipe[];
  pantry: PantryItem[];
  shopping: ShoppingItem[];
  tasks: Task[];
  expenses: Expense[];
  members: Member[];
  currentMemberId: string | null;
}) {
  const router = useRouter();
  const editSheet = useSheet<FamilyEvent>();
  const menuSheet = useSheet<MenuItem>();
  const taskSheet = useSheet<Task>();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const today = todayAR();
  const days = Math.round((Date.parse(event.event_date) - Date.parse(today)) / 86400000);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Ingredientes del menú escalados a invitados, comparados con la despensa.
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const merged = mergeIngredients(
    event.menu.filter((m) => m.recipe_id && byId.has(m.recipe_id)).map((m) => scaleIngredients(byId.get(m.recipe_id!)!, m.portions))
  );
  const checks = checkPantry(merged, pantry);
  const missing = checks.filter((c) => !(c.have && c.missing === 0));

  async function run(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key);
    setMsg(null);
    try {
      const r = await fn();
      if (done) setMsg(typeof r === "number" ? done.replace("{n}", String(r)) : done);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Algo falló.");
    } finally {
      setBusy(null);
    }
  }

  function submitEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    editSheet.run(async () => {
      await saveFamilyEvent({
        id: event.id,
        title: f.str("title"),
        event_date: f.str("event_date"),
        event_time: f.opt("event_time"),
        location: f.opt("location"),
        guests: f.str("guests"),
        budget: f.opt("budget"),
        notes: f.opt("notes"),
      });
    });
  }

  function submitMenu(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    const recipeId = f.opt("recipe_id");
    const recipe = recipeId ? byId.get(recipeId) : null;
    const item: MenuItem = { recipe_id: recipeId, title: f.str("title") || recipe?.title || "", portions: f.num("portions") || event.guests || 1 };
    menuSheet.run(() => setEventMenu(event.id, [...event.menu, item]));
  }

  function submitTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    taskSheet.run(() => addEventTask(event.id, f.str("title"), f.opt("assigned_to"), f.str("due_date")));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <section className="lb-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-h1 font-display font-bold text-ink">{event.title}</h1>
            <p className="text-body text-ink-soft">
              {formatDay(event.event_date, "EEEE d 'de' MMMM")}
              {event.event_time ? ` · ${shortTime(event.event_time)}` : ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            <p className="text-meta text-ink-faint">
              {event.guests} invitados{event.notes ? ` · ${event.notes}` : ""}
            </p>
          </div>
          {event.status !== "done" && days >= 0 && (
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${days <= 3 ? "bg-coral-soft text-coral" : "bg-amber-soft text-amber"}`}>
              {daysUntilLabel(days)}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => editSheet.openEdit(event)} className="lb-chip min-h-9 border-[1.5px] border-line text-ink-soft">
            Editar datos
          </button>
          <button
            type="button"
            onClick={() => run("status", () => setEventStatus(event.id, event.status === "done" ? "planning" : "done"))}
            className="lb-chip min-h-9 border-[1.5px] border-line text-ink-soft"
          >
            {event.status === "done" ? "Reabrir" : "Marcar como pasado"}
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
      </section>

      {/* Presupuesto */}
      {(event.budget || expenses.length > 0) && (
        <section className="lb-card">
          <h2 className="text-h2 mb-2 flex items-center gap-2 font-display uppercase tracking-wide" style={{ color: "var(--color-ariana)" }}>
            <Wallet size={16} /> Presupuesto
          </h2>
          {event.budget ? (
            <>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-track">
                <div
                  className={`h-full rounded-full ${spent > Number(event.budget) ? "bg-danger" : "bg-success"}`}
                  style={{ width: `${Math.min(100, Math.round((spent / Number(event.budget)) * 100))}%` }}
                />
              </div>
              <p className="mt-1.5 text-meta text-ink-faint">
                {formatARS(spent)} gastados de {formatARS(Number(event.budget))}
                {spent > Number(event.budget) ? ` · te pasaste ${formatARS(spent - Number(event.budget))}` : ` · quedan ${formatARS(Number(event.budget) - spent)}`}
              </p>
            </>
          ) : (
            <p className="text-meta text-ink-faint">{formatARS(spent)} gastados. Cargá gastos desde Finanzas eligiendo este evento.</p>
          )}
        </section>
      )}

      {/* Menú */}
      <section className="lb-card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide" style={{ color: "#0EA5A5" }}>
            <ChefHat size={16} /> Menú
          </h2>
          <button type="button" onClick={menuSheet.openNew} className="flex h-9 items-center gap-1 rounded-full bg-line/60 px-3 text-xs font-semibold text-ink">
            <Plus size={14} /> Plato
          </button>
        </div>
        {event.menu.length === 0 && <p className="text-body text-ink-faint">Agregá los platos (con receta, se calculan los ingredientes para {event.guests} personas).</p>}
        <ul className="flex flex-col gap-1.5">
          {event.menu.map((m, i) => (
            <li key={i} className="flex min-h-10 items-center gap-2 text-item">
              <span className="flex-1 text-ink">{m.title}</span>
              <span className="text-meta text-ink-faint">{m.portions} p.</span>
              <button
                type="button"
                aria-label="Quitar plato"
                onClick={() => run(`menu-${i}`, () => setEventMenu(event.id, event.menu.filter((_, idx) => idx !== i)))}
                className="flex h-9 w-9 items-center justify-center text-ink-ghost"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
        {merged.length > 0 && (
          <div className="mt-3 rounded-md bg-cream p-3 text-sm">
            <p className="text-ink">
              <span className="font-semibold text-coral">Falta comprar ({missing.length}):</span>{" "}
              {missing.map((c) => `${c.ingredient.name}${c.missing != null ? ` ${formatQty(c.missing, c.ingredient.unit)}` : ""}`).join(", ") || "nada, ya tienen todo"}
            </p>
            <button
              type="button"
              disabled={busy === "send" || missing.length === 0}
              onClick={() => run("send", () => sendEventMenuToShopping(event.id, currentMemberId), "{n} productos mandados a Compras")}
              className="lb-btn mt-2 min-h-10 !py-2 text-sm disabled:opacity-50"
            >
              <ShoppingCart size={15} className="mr-1 inline" /> Mandar a Compras
            </button>
          </div>
        )}
      </section>

      {/* Compras del evento */}
      {shopping.length > 0 && (
        <section className="lb-card">
          <h2 className="text-h2 mb-2 flex items-center gap-2 font-display uppercase tracking-wide" style={{ color: "#FF9F43" }}>
            <ShoppingCart size={16} /> Compras del evento · {shopping.filter((s) => !s.checked).length} pendientes
          </h2>
          <ul>
            {shopping.map((s) => (
              <li key={s.id} className="flex min-h-10 items-center gap-2">
                <button type="button" aria-label="Marcar" onClick={() => run(s.id, () => toggleShoppingItem(s.id, !s.checked))} className="flex h-10 w-8 items-center justify-center">
                  {s.checked ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-line" />}
                </button>
                <span className={`flex-1 text-item ${s.checked ? "text-ink-ghost line-through" : "text-ink"}`}>
                  {s.name}
                  {s.quantity && <span className="text-meta text-ink-faint"> × {s.quantity}</span>}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/compras" className="mt-2 inline-block text-sm font-semibold text-coral">
            Ver toda la lista →
          </Link>
        </section>
      )}

      {/* Tareas */}
      <section className="lb-card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
            <ListChecks size={16} /> Tareas previas
          </h2>
          <button type="button" onClick={taskSheet.openNew} className="flex h-9 items-center gap-1 rounded-full bg-line/60 px-3 text-xs font-semibold text-ink">
            <Plus size={14} /> Tarea
          </button>
        </div>
        {tasks.length === 0 && <p className="text-body text-ink-faint">Reservar el salón, comprar la torta, mandar invitaciones…</p>}
        <ul>
          {tasks.map((t) => (
            <li key={t.id} className="flex min-h-10 items-center gap-2">
              <button type="button" aria-label="Marcar" onClick={() => run(t.id, () => toggleTask(t.id, !t.done))} className="flex h-10 w-8 items-center justify-center">
                {t.done ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="text-line" />}
              </button>
              <span className={`flex-1 text-item ${t.done ? "text-ink-ghost line-through" : "text-ink"}`}>{t.title}</span>
              <span className="text-meta text-ink-faint">{formatDay(t.due_date, "d MMM")}</span>
              <MemberChip member={memberById(members, t.assigned_to)} />
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => {
          if (confirm(`¿Borramos "${event.title}" con su menú y tareas?`)) run("del", () => deleteFamilyEvent(event.id).then(() => router.push("/eventos")));
        }}
        className="min-h-11 text-sm font-semibold text-danger"
      >
        Borrar evento
      </button>

      {/* Sheet editar */}
      <BottomSheet open={editSheet.open} onClose={editSheet.close} title="Editar evento">
        <form onSubmit={submitEdit} className="flex flex-col gap-4">
          <Field label="Qué celebran">
            <Input name="title" required defaultValue={event.title} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input name="event_date" type="date" required defaultValue={event.event_date} />
            </Field>
            <Field label="Hora">
              <Input name="event_time" type="time" defaultValue={shortTime(event.event_time)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invitados">
              <Input name="guests" type="number" inputMode="numeric" min="0" defaultValue={event.guests} />
            </Field>
            <Field label="Presupuesto ($)">
              <Input name="budget" type="number" inputMode="decimal" step="any" min="0" defaultValue={event.budget ?? ""} />
            </Field>
          </div>
          <Field label="Dónde">
            <Input name="location" defaultValue={event.location ?? ""} />
          </Field>
          <Field label="Notas">
            <Textarea name="notes" defaultValue={event.notes ?? ""} />
          </Field>
          {editSheet.error && <p className="text-sm text-danger">{editSheet.error}</p>}
          <SubmitRow saving={editSheet.saving} />
        </form>
      </BottomSheet>

      {/* Sheet plato */}
      <BottomSheet open={menuSheet.open} onClose={menuSheet.close} title="Agregar plato">
        <form onSubmit={submitMenu} className="flex flex-col gap-4">
          <Field label="Receta (opcional)">
            <Select name="recipe_id" defaultValue="">
              <option value="">Sin receta (solo el nombre)</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <Field label="Nombre del plato">
              <Input name="title" placeholder="Empanadas, torta…" />
            </Field>
            <Field label="Porciones">
              <Input name="portions" type="number" inputMode="numeric" min="1" defaultValue={event.guests || 10} />
            </Field>
          </div>
          {menuSheet.error && <p className="text-sm text-danger">{menuSheet.error}</p>}
          <SubmitRow saving={menuSheet.saving} submitLabel="Agregar" />
        </form>
      </BottomSheet>

      {/* Sheet tarea */}
      <BottomSheet open={taskSheet.open} onClose={taskSheet.close} title="Tarea del evento">
        <form onSubmit={submitTask} className="flex flex-col gap-4">
          <Field label="Qué hay que hacer">
            <Input name="title" required autoFocus placeholder="Encargar la torta" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quién">
              <MemberSelect name="assigned_to" members={members} defaultValue={currentMemberId ?? ""} />
            </Field>
            <Field label="Para cuándo">
              <Input name="due_date" type="date" required defaultValue={event.event_date} />
            </Field>
          </div>
          {taskSheet.error && <p className="text-sm text-danger">{taskSheet.error}</p>}
          <SubmitRow saving={taskSheet.saving} submitLabel="Agregar" />
        </form>
      </BottomSheet>
    </div>
  );
}
