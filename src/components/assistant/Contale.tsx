"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, CalendarHeart, CarFront, CheckCircle2, ChefHat, Mic, PartyPopper, Pencil, PiggyBank, ShoppingCart, Sparkles, Square, Undo2, type LucideIcon } from "lucide-react";
import type { Member } from "@/lib/types";
import type { Plan, PlanItem, PlanKind } from "@/lib/assistant";
import { applyPlan, undoPlan, type ApplyResult } from "@/app/actions/assistant";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useDictation } from "@/components/ui/useDictation";
import { Input, MemberSelect, Textarea } from "@/components/ui/Field";
import { addDays, formatARS, formatDay } from "@/lib/format";

const DRAFT_KEY = "lb-contale-draft";

const KINDS: Record<PlanKind, { icon: LucideIcon; color: string; label: string; href: string; plural: (n: number) => string }> = {
  evento: { icon: CalendarHeart, color: "#6366F1", label: "Calendario", href: "/calendario", plural: (n) => `${n} en el calendario` },
  viaje: { icon: CarFront, color: "#10B981", label: "Logística", href: "/logistica", plural: (n) => (n === 1 ? "1 viaje" : `${n} viajes`) },
  tarea: { icon: CheckCircle2, color: "#F59E0B", label: "Tarea", href: "/", plural: (n) => (n === 1 ? "1 tarea" : `${n} tareas`) },
  compra: { icon: ShoppingCart, color: "#FF9F43", label: "Compras", href: "/compras", plural: (n) => (n === 1 ? "1 compra" : `${n} compras`) },
  recordatorio: { icon: BellRing, color: "#F59E0B", label: "Vencimiento", href: "/vencimientos", plural: (n) => (n === 1 ? "1 vencimiento" : `${n} vencimientos`) },
  comida: { icon: ChefHat, color: "#0EA5A5", label: "Menú", href: "/menu", plural: (n) => (n === 1 ? "1 comida" : `${n} comidas`) },
  evento_familiar: { icon: PartyPopper, color: "#FF5A5F", label: "Evento", href: "/eventos", plural: (n) => (n === 1 ? "1 evento" : `${n} eventos`) },
  presupuesto: { icon: PiggyBank, color: "#EC4899", label: "Tope de gasto", href: "/finanzas", plural: (n) => (n === 1 ? "1 tope" : `${n} topes`) },
};

const THINKING = ["Leyendo lo que me contaste…", "Ubicando cada cosa en su día…", "Armando la logística…", "Haciendo la lista de compras…", "Ya casi…"];

type Stage = "input" | "thinking" | "review" | "saving" | "done";
type Row = PlanItem & { key: number; on: boolean };

// "Contale a Lovebug": hablás o escribís lo que tenés hoy y los próximos días; la IA lo reparte
// en calendario, logística, tareas, compras, vencimientos y menú, y vos aprobás antes de cargar.
export function Contale({ members, today }: { members: Member[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [text, setText] = useState("");
  const [correction, setCorrection] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Extract<ApplyResult, { ok: true }> | null>(null);
  const [undoState, setUndoState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState<Live>({ summary: null, items: [] });
  const dictation = useDictation(text, setText);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setText(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (text) localStorage.setItem(DRAFT_KEY, text);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [text]);

  useEffect(() => {
    if (stage !== "thinking") return;
    const id = setInterval(() => setTick((t) => t + 1), 3500);
    return () => clearInterval(id);
  }, [stage]);

  const close = useCallback(() => {
    dictation.stop();
    setOpen(false);
    if (stage === "done") {
      setStage("input");
      setPlan(null);
      setRows([]);
      setCounts(null);
    }
  }, [dictation, stage]);

  async function organize(extra?: string) {
    dictation.stop();
    const full = extra ? `${text.trim()}\n\nAclaración: ${extra.trim()}` : text.trim();
    setError(null);
    setTick(0);
    setLive({ summary: null, items: [] });
    setStage("thinking");
    const res = await streamPlan(full, setLive);
    if (!res.ok) {
      setError(res.error);
      setStage(plan ? "review" : "input");
      return;
    }
    if (extra) {
      setText(full);
      setCorrection("");
    }
    setPlan(res.plan);
    setRows(res.plan.items.map((item, key) => ({ ...item, key, on: true })));
    setEditing(null);
    setStage("review");
  }

  async function save() {
    // El servidor se queda solo con los campos del ítem (key/on se descartan al validar).
    const chosen: PlanItem[] = rows.filter((r) => r.on);
    if (!chosen.length) return;
    setError(null);
    setStage("saving");
    const res = await applyPlan(chosen).catch(() => ({ ok: false as const, error: "Se cortó la conexión. Probá de nuevo." }));
    if (!res.ok) {
      setError(res.error);
      setStage("review");
      return;
    }
    setCounts(res);
    setUndoState("idle");
    setText("");
    setStage("done");
    router.refresh();
  }

  const update = (key: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const chosenCount = rows.filter((r) => r.on).length;
  const onlyCreates = rows.filter((r) => r.on).every((r) => r.action === "crear");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="lb-card flex items-center gap-3 !bg-coral-soft text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-coral text-white">
          <Mic size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-h2 font-bold text-ink">Contale a Lovebug</span>
          <span className="block text-meta text-ink-soft">Decime qué tienen hoy o esta semana, o qué cambió: lo cargo, lo muevo o lo cancelo.</span>
        </span>
      </button>

      <BottomSheet open={open} onClose={close} title={stage === "review" || stage === "saving" ? "Esto entendí" : stage === "done" ? "¡Listo!" : "Contale a Lovebug"}>
        {stage === "input" && (
          <div className="flex flex-col gap-4">
            <p className="text-body text-ink-soft">
              Contalo como en un audio: qué tienen, cuándo, quién lleva a quién, qué hay que comprar. O qué cambió: “pasá la reunión a las 17”, “cancelá lo
              del domingo”, “ahora somos 30 en el cumple”.
            </p>
            {dictation.supported && (
              <button
                type="button"
                onClick={dictation.listening ? dictation.stop : dictation.start}
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white shadow-pop transition-transform disabled:opacity-50 ${
                  dictation.listening ? "scale-110 animate-pulse bg-danger" : "bg-coral"
                }`}
                aria-label={dictation.listening ? "Terminar de grabar" : "Hablar"}
              >
                {dictation.listening ? <Square size={26} fill="currentColor" /> : <Mic size={32} />}
              </button>
            )}
            <p className="-mt-2 text-center text-meta text-ink-faint">
              {dictation.supported
                ? dictation.listening
                  ? "Te escucho… tocá para terminar."
                  : "Tocá para hablar, o escribilo abajo."
                : "Escribilo abajo, o usá el micrófono del teclado para dictar."}
            </p>
            {dictation.error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{dictation.error}</p>}
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hoy a las 16 tengo reunión de padres en el jardín y a las 17 lo retiro. El sábado a las 8 Mica se va de campamento desde la parroquia; hay que comprarle la bolsa de dormir…"
            />
            {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <button type="button" onClick={() => organize()} disabled={text.trim().length < 8} className="lb-btn flex items-center justify-center gap-2 disabled:opacity-60">
              <Sparkles size={16} /> Ordenalo
            </button>
            {text && (
              <button type="button" onClick={() => setText("")} className="-mt-2 min-h-10 text-sm font-semibold text-ink-faint">
                Borrar y empezar de nuevo
              </button>
            )}
          </div>
        )}

        {stage === "thinking" && (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="flex items-center gap-2 text-body font-semibold text-coral">
              <Sparkles size={16} className="animate-pulse" />
              {live.items.length ? `Encontré ${live.items.length} ${live.items.length === 1 ? "cosa" : "cosas"}…` : THINKING[Math.min(tick, THINKING.length - 1)]}
            </p>
            {live.summary && <p className="rounded-md bg-coral-soft px-3 py-2.5 text-body text-ink">{live.summary}</p>}
            {live.items.length > 0 && (
              <ul className="flex flex-col divide-y divide-line rounded-md border-[1.5px] border-line bg-surface">
                {live.items.map((item, i) => {
                  const K = KINDS[item.kind] ?? KINDS.tarea;
                  return (
                    <li key={i} className="flex items-center gap-3 px-3 py-2">
                      <K.icon size={16} className="shrink-0" style={{ color: K.color }} />
                      <span className={`min-w-0 flex-1 truncate text-item ${item.action === "cancelar" ? "text-danger line-through" : "text-ink"}`}>
                        {item.action === "modificar" && <ActionTag className="bg-info-soft text-info">Cambio</ActionTag>}
                        {item.action === "cancelar" && <ActionTag className="bg-danger/10 text-danger">Cancelar</ActionTag>}
                        {item.title}
                      </span>
                      <span className="shrink-0 text-meta text-ink-faint">{item.date ? dayLabel(item.date, today) : ""}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {(stage === "review" || stage === "saving") && plan && (
          <div className="flex flex-col gap-4">
            {plan.summary && <p className="rounded-md bg-coral-soft px-3 py-2.5 text-body text-ink">{plan.summary}</p>}

            {rows.length === 0 ? (
              <p className="text-body text-ink-faint">No encontré nada para cargar. Contame qué, cuándo y quién.</p>
            ) : (
              groupByDay(rows, today).map((group) => (
                <div key={group.key}>
                  <h3 className="mb-1.5 text-label font-bold uppercase tracking-wider text-ink-ghost">{group.label}</h3>
                  <ul className="flex flex-col divide-y divide-line rounded-md border-[1.5px] border-line bg-surface">
                    {group.rows.map((r) => (
                      <PlanRow
                        key={r.key}
                        row={r}
                        members={members}
                        editing={editing === r.key}
                        onEdit={() => setEditing(editing === r.key ? null : r.key)}
                        onChange={(patch) => update(r.key, patch)}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}

            {plan.questions.length > 0 && (
              <div className="rounded-md bg-amber-soft px-3 py-2.5">
                <p className="mb-1 text-label font-bold uppercase tracking-wider text-amber">Para tener en cuenta</p>
                <ul className="flex flex-col gap-1 text-body text-ink">
                  {plan.questions.map((q) => (
                    <li key={q}>• {q}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Textarea
                rows={2}
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                disabled={stage === "saving"}
                placeholder={plan.questions.length ? "Respondé o corregí algo: “la lleva papá”, “Mica y Micaela son la misma”…" : "¿Algo para corregir o sumar?"}
              />
              {correction.trim().length > 2 && (
                <button type="button" onClick={() => organize(correction)} className="min-h-11 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink">
                  Rehacer con esto
                </button>
              )}
            </div>

            {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <button type="button" onClick={save} disabled={stage === "saving" || chosenCount === 0} className="lb-btn disabled:opacity-60">
              {stage === "saving"
                ? "Aplicando…"
                : onlyCreates
                  ? chosenCount === 1
                    ? "Cargar 1 cosa"
                    : `Cargar ${chosenCount} cosas`
                  : chosenCount === 1
                    ? "Aplicar 1 cambio"
                    : `Aplicar ${chosenCount} cambios`}
            </button>
            <button type="button" onClick={() => setStage("input")} disabled={stage === "saving"} className="-mt-2 min-h-10 text-sm font-semibold text-ink-faint">
              Volver a lo que conté
            </button>
          </div>
        )}

        {stage === "done" && counts && undoState === "done" && (
          <div className="flex flex-col gap-4">
            <p className="text-body text-ink">Listo, quedó todo como estaba antes. 👌</p>
            <button
              type="button"
              onClick={() => {
                setStage("input");
                setPlan(null);
                setRows([]);
                setCounts(null);
              }}
              className="lb-btn"
            >
              Contarlo de nuevo
            </button>
          </div>
        )}

        {stage === "done" && counts && undoState !== "done" && (
          <div className="flex flex-col gap-4">
            <p className="text-body text-ink">Ya quedó todo al día. Lo ven todos en el hogar.</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(counts.created) as PlanKind[]).map((k) => {
                const K = KINDS[k];
                return (
                  <Link key={k} href={K.href} onClick={close} className="flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-line bg-surface px-3 text-sm font-semibold text-ink">
                    <K.icon size={15} style={{ color: K.color }} /> {K.plural(counts.created[k] ?? 0)}
                  </Link>
                );
              })}
              {counts.changed > 0 && (
                <span className="flex min-h-10 items-center gap-2 rounded-full bg-info-soft px-3 text-sm font-semibold text-info">
                  <Pencil size={14} /> {counts.changed === 1 ? "1 cambio" : `${counts.changed} cambios`}
                </span>
              )}
              {counts.cancelled > 0 && (
                <span className="flex min-h-10 items-center gap-2 rounded-full bg-danger/10 px-3 text-sm font-semibold text-danger">
                  {counts.cancelled === 1 ? "1 cancelado" : `${counts.cancelled} cancelados`}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setStage("input");
                setPlan(null);
                setRows([]);
                setCounts(null);
              }}
              className="lb-btn"
            >
              Contar otra cosa
            </button>
            {/* Por si la IA entendió algo mal: vuelve todo a como estaba antes de aplicar. */}
            <button
              type="button"
              disabled={undoState === "busy"}
              onClick={async () => {
                setUndoState("busy");
                const r = await undoPlan(counts.undo).catch(() => ({ ok: false }));
                setUndoState(r.ok ? "done" : "failed");
                router.refresh();
              }}
              className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-ink-faint disabled:opacity-60"
            >
              <Undo2 size={15} /> {undoState === "busy" ? "Deshaciendo…" : "Deshacer todo"}
            </button>
            {undoState === "failed" && <p className="text-sm text-danger">Se deshizo una parte. Revisá las pantallas.</p>}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function PlanRow({
  row,
  members,
  editing,
  onEdit,
  onChange,
}: {
  row: Row;
  members: Member[];
  editing: boolean;
  onEdit: () => void;
  onChange: (patch: Partial<Row>) => void;
}) {
  const K = KINDS[row.kind] ?? KINDS.tarea;
  const cancel = row.action === "cancelar";
  const change = row.action === "modificar";
  // En un viaje del que solo se sabe la hora de llegada ("llegar 20:00"), la hora que se edita es esa.
  const timeKey: "time" | "end_time" = row.kind === "viaje" && !row.time && row.end_time ? "end_time" : "time";
  const who = members.find((m) => m.id === row.member_id);
  const driver = members.find((m) => m.id === row.driver_id);
  const meta = cancel
    ? []
    : [
        change && row.date ? `→ ${formatDay(row.date, "EEE d")}` : null,
        row.time ? (row.end_time ? `${row.time} a ${row.end_time}` : row.time) : row.end_time ? `llegar ${row.end_time}` : null,
        row.kind === "viaje" ? [row.origin && `desde ${row.origin}`, row.place && `a ${row.place}`].filter(Boolean).join(" ") || null : row.place,
        row.kind === "viaje" && driver ? `lleva ${driver.nickname ?? driver.name}` : null,
        who && row.kind !== "compra" ? (row.kind === "viaje" ? `viaja ${who.nickname ?? who.name}` : who.nickname ?? who.name) : null,
        row.quantity,
        row.guests !== null && row.guests !== undefined ? `${row.guests} invitados` : null,
        row.amount ? (row.kind === "presupuesto" ? `tope ${formatARS(row.amount)}` : formatARS(row.amount)) : null,
        row.notes,
      ].filter(Boolean);

  return (
    <li className={`px-3 py-2.5 ${row.on ? "" : "opacity-50"}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.on}
          onChange={(e) => onChange({ on: e.target.checked })}
          aria-label={row.on ? "No aplicar" : "Aplicar"}
          className="mt-1 h-5 w-5 shrink-0 accent-coral"
        />
        <K.icon size={17} className="mt-0.5 shrink-0" style={{ color: cancel ? "var(--color-danger)" : K.color }} aria-label={K.label} />
        <button type="button" onClick={cancel ? undefined : onEdit} className="min-w-0 flex-1 text-left">
          <span className={`block text-item font-medium ${cancel ? "text-danger line-through" : "text-ink"}`}>
            {change && <ActionTag className="bg-info-soft text-info">Cambio</ActionTag>}
            {cancel && <ActionTag className="bg-danger/10 text-danger">Cancelar</ActionTag>}
            {row.title}
            {row.suggested && <span className="ml-1.5 rounded-full bg-info-soft px-1.5 py-0.5 align-middle text-[11px] font-semibold text-info">idea</span>}
          </span>
          {meta.length > 0 && <span className="block text-meta text-ink-soft">{meta.join(" · ")}</span>}
          {row.target?.label && (
            <span className="block text-meta text-ink-faint">
              {cancel ? "Se borra: " : "Antes: "}
              {row.target.label}
            </span>
          )}
        </button>
        {!cancel && (
          <button type="button" onClick={onEdit} aria-label="Editar" className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-ghost">
            <Pencil size={14} />
          </button>
        )}
      </div>
      {editing && !cancel && (
        <div className="mt-2 flex flex-col gap-2 pl-8">
          {change && <p className="text-meta text-ink-faint">Lo que dejes vacío queda como estaba.</p>}
          <Input value={row.title} onChange={(e) => onChange({ title: e.target.value })} aria-label="Título" />
          {row.kind !== "compra" && row.kind !== "presupuesto" && (
            <div className="flex gap-2">
              <Input type="date" value={row.date ?? ""} onChange={(e) => onChange({ date: e.target.value || null })} aria-label="Día" className="min-w-0 flex-1" />
              {row.kind !== "recordatorio" && row.kind !== "comida" && (
                <Input
                  type="time"
                  value={row[timeKey] ?? ""}
                  onChange={(e) => onChange({ [timeKey]: e.target.value || null })}
                  aria-label={timeKey === "end_time" ? "Hora de llegada" : "Hora"}
                  className="!w-28 shrink-0"
                />
              )}
            </div>
          )}
          {row.kind === "viaje" && (
            <EditLine label="Lleva">
              <MemberSelect members={members.filter((m) => !m.is_child)} noneLabel="Sin definir" value={row.driver_id ?? ""} onChange={(e) => onChange({ driver_id: e.target.value || null })} aria-label="Quién lleva" />
            </EditLine>
          )}
          {row.kind !== "compra" && row.kind !== "presupuesto" && row.kind !== "evento_familiar" && (
            <EditLine label={row.kind === "viaje" ? "Viaja" : "De"}>
              <MemberSelect members={members} noneLabel={row.kind === "viaje" ? "Nadie de casa" : "Todos"} value={row.member_id ?? ""} onChange={(e) => onChange({ member_id: e.target.value || null })} aria-label={row.kind === "viaje" ? "Quién viaja" : "De quién"} />
            </EditLine>
          )}
          {row.kind === "evento_familiar" && (
            <EditLine label="Invit.">
              <Input type="number" inputMode="numeric" min={0} value={row.guests ?? ""} onChange={(e) => onChange({ guests: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))) })} aria-label="Invitados" />
            </EditLine>
          )}
          {(row.kind === "recordatorio" || row.kind === "presupuesto" || row.kind === "evento_familiar") && (
            <EditLine label="$">
              <Input type="number" inputMode="numeric" min={0} value={row.amount ?? ""} onChange={(e) => onChange({ amount: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))) })} aria-label={row.kind === "presupuesto" ? "Tope mensual" : row.kind === "evento_familiar" ? "Presupuesto" : "Monto"} />
            </EditLine>
          )}
        </div>
      )}
    </li>
  );
}

function ActionTag({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide ${className}`}>{children}</span>;
}

function EditLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-label font-bold uppercase tracking-wider text-ink-ghost">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function dayLabel(date: string, today: string, pattern = "EEE d"): string {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  return formatDay(date, pattern);
}

// Primero lo que cambia o se cancela de lo que ya estaba; después lo nuevo, día por día.
function groupByDay(rows: Row[], today: string) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.action !== "crear" ? "!cambios" : r.kind === "compra" ? "~compras" : r.kind === "presupuesto" ? "~topes" : r.date ?? "~sinfecha";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const labels: Record<string, string> = {
    "!cambios": "Cambios en lo que ya tenían",
    "~compras": "Para comprar",
    "~topes": "Topes de gasto",
    "~sinfecha": "Sin fecha (va para hoy)",
  };
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) // "!cambios" primero, fechas en orden, los "~" al final
    .map(([key, list]) => ({
      key,
      label: labels[key] ?? dayLabel(key, today, "EEEE d 'de' MMMM"),
      rows: list.sort((a, b) => (a.time ?? a.end_time ?? "99").localeCompare(b.time ?? b.end_time ?? "99")),
    }));
}

type Live = { summary: string | null; items: PlanItem[] };

// Lee el plan en streaming desde /api/contale y va mostrando lo que ya está completo.
async function streamPlan(text: string, onLive: (live: Live) => void): Promise<{ ok: true; plan: Plan } | { ok: false; error: string }> {
  const offline = { ok: false as const, error: "Se cortó la conexión. Probá de nuevo." };
  try {
    const res = await fetch("/api/contale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("ndjson")) return offline;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let raw = "";
    let shownItems = -1;
    let shownSummary = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const event = JSON.parse(line) as { t: "delta"; v: string } | { t: "done"; plan: Plan } | { t: "error"; error: string };
        if (event.t === "done") return { ok: true, plan: event.plan };
        if (event.t === "error") return { ok: false, error: event.error };
        raw += event.v;
        const live = peekPlan(raw);
        if (live.items.length !== shownItems || (live.summary && !shownSummary)) {
          shownItems = live.items.length;
          shownSummary = Boolean(live.summary);
          onLive(live);
        }
      }
    }
    return offline;
  } catch {
    return offline;
  }
}

// Saca del JSON a medio escribir el resumen y los ítems que ya están cerrados.
function peekPlan(raw: string): Live {
  let summary: string | null = null;
  const m = /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw);
  if (m) {
    try {
      summary = JSON.parse(`"${m[1]}"`);
    } catch {}
  }
  const items: PlanItem[] = [];
  const key = raw.indexOf('"items"');
  const open = key >= 0 ? raw.indexOf("[", key) : -1;
  if (open >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    let start = -1;
    for (let i = open + 1; i < raw.length; i++) {
      const c = raw[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === "{") {
        if (depth === 0) start = i;
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0 && start >= 0) {
          try {
            items.push(JSON.parse(raw.slice(start, i + 1)));
          } catch {}
          start = -1;
        }
      } else if (c === "]" && depth === 0) break;
    }
  }
  return { summary, items };
}
