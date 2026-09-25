"use client";

import { useState, type FormEvent } from "react";
import { Check, Circle, Copy, Share2, SplitSquareHorizontal, Trash2 } from "lucide-react";
import type { EventGuest, EventSplit as EventSplitType, EventSplitShare, FamilyEvent, Member } from "@/lib/types";
import { deleteEventSplit, saveEventSplit, markShareStatus } from "@/app/actions/splits";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, Input, MemberSelect, Select, Textarea } from "@/components/ui/Field";
import { fd } from "@/components/ui/useSheet";
import { formatARS } from "@/lib/format";
import { payLink } from "@/lib/app";
import { SectionTitle, useRun } from "./shared";

export type ShareWithGuest = EventSplitShare & { guest: EventGuest };

// Divide lo gastado en el evento entre los que participaron. Partes iguales (se calcula
// solo) o a mano (cada uno lo suyo). Cada uno se marca pagado cuando llega la plata —
// aunque haya sido en efectivo o por fuera de la app — y eso queda como reintegro en Finanzas.
// No mueve plata: solo lleva la cuenta y muestra tu alias/link para que te transfieran.
export function EventSplit({
  event,
  split,
  shares,
  guests,
  members,
  spent,
  currentMemberId,
}: {
  event: FamilyEvent;
  split: EventSplitType | null;
  shares: ShareWithGuest[];
  guests: EventGuest[];
  members: Member[];
  spent: number;
  currentMemberId: string | null;
}) {
  const { busy, msg, run } = useRun();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"equal" | "manual">(split?.method ?? "equal");
  const [picked, setPicked] = useState<Set<string>>(new Set(split ? shares.map((s) => s.guest_id) : guests.filter((g) => g.confirmed && !g.is_child).map((g) => g.id)));
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState<ShareWithGuest | null>(null);
  const eligible = guests.filter((g) => g.confirmed);

  const total = shares.reduce((s, x) => s + Number(x.amount), 0);
  const paid = shares.filter((s) => s.status === "pagado").reduce((s, x) => s + Number(x.amount), 0);
  const payer = members.find((m) => m.id === split?.payer_member_id);
  const link = split ? payLink(split.share_token) : null;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    const ids = [...picked];
    if (!ids.length) return;
    run(
      "save",
      () =>
        saveEventSplit({
          event_id: event.id,
          method,
          payer_member_id: f.opt("payer_member_id"),
          payment_info: f.opt("payment_info"),
          total: f.str("total"),
          guests: ids.map((guest_id) => ({ guest_id, amount: f.opt(`amount-${guest_id}`) ?? 0 })),
        }),
      "Guardado"
    );
    setOpen(false);
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el navegador no dejó copiar; el link igual se puede seleccionar a mano */
    }
  }

  async function share() {
    if (!link) return;
    const text = `${event.title}: te toca ${formatARS(shares.find((s) => currentMemberId && s.guest.member_id === currentMemberId)?.amount ?? 0)}. Mirá el detalle: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text, url: link });
        return;
      } catch {
        /* canceló */
      }
    }
    await copyLink();
  }

  return (
    <section className="lb-card">
      <SectionTitle
        icon={<SplitSquareHorizontal size={16} />}
        color="var(--color-ariana)"
        action={
          <button type="button" onClick={() => setOpen(true)} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-line/60 px-3 text-xs font-semibold text-ink">
            {split ? "Editar" : "Dividir gastos"}
          </button>
        }
      >
        División de gastos
      </SectionTitle>

      {!split ? (
        <p className="text-body text-ink-faint">
          Repartí lo gastado ({formatARS(spent)}) entre los que participaron: partes iguales o a mano, y llevás quién ya te pagó.
        </p>
      ) : (
        <>
          <p className="text-meta text-ink-faint">
            {formatARS(total)} a repartir{payer ? ` · le pagan a ${payer.nickname ?? payer.name}` : ""} · cobrado {formatARS(paid)} de {formatARS(total)}
          </p>
          {split.payment_info && (
            <p className="mt-1 rounded-md bg-field px-3 py-2 text-sm text-ink">
              <span className="font-semibold text-ink-faint">Para pagar: </span>
              {split.payment_info}
            </p>
          )}
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  aria-label={s.status === "pagado" ? "Marcar pendiente" : "Marcar pagado"}
                  disabled={busy === s.id}
                  onClick={() => {
                    if (s.status === "pagado") {
                      if (confirm(`¿Volver a poner pendiente a ${s.guest.name}? Se saca el reintegro de Finanzas.`))
                        run(s.id, () => markShareStatus({ eventId: event.id, shareId: s.id, status: "pendiente" }));
                    } else setPaying(s);
                  }}
                  className="flex h-9 w-8 items-center justify-center"
                >
                  {s.status === "pagado" ? <Check size={19} className="text-success" /> : <Circle size={19} className="text-line" />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className={`block text-item ${s.status === "pagado" ? "text-ink-ghost line-through" : "text-ink"}`}>{s.guest.name}</span>
                  {s.paid_note && <span className="block text-meta text-ink-faint">{s.paid_note}</span>}
                </span>
                <span className="shrink-0 font-semibold text-ink">{formatARS(Number(s.amount))}</span>
              </li>
            ))}
          </ul>
          {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
          {link && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={share} className="lb-btn flex items-center gap-2 !px-4 !py-2 text-sm">
                <Share2 size={15} /> Compartir
              </button>
              <button type="button" onClick={copyLink} className="flex min-h-10 items-center gap-2 rounded-md border-[1.5px] border-line px-3 text-sm font-semibold text-ink">
                {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />} {copied ? "Copiado" : "Copiar link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("¿Borrar la división? Los reintegros ya cargados en Finanzas también se sacan.")) run("del", () => deleteEventSplit(event.id, split.id));
                }}
                className="ml-auto min-h-10 px-2 text-sm font-semibold text-danger"
              >
                <Trash2 size={15} className="inline" />
              </button>
            </div>
          )}
        </>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title={split ? "Editar división" : "Dividir gastos"}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {eligible.length === 0 ? (
            <p className="text-body text-ink-faint">Primero cargá a los invitados, arriba, para poder repartir entre ellos.</p>
          ) : (
            <>
              <Field label="Cómo se reparte">
                <Select value={method} onChange={(e) => setMethod(e.target.value as "equal" | "manual")}>
                  <option value="equal">Partes iguales</option>
                  <option value="manual">A mano, cada uno lo suyo</option>
                </Select>
              </Field>
              {method === "equal" && (
                <Field label="Total a repartir ($)" hint={`Lo gastado en el evento fue ${formatARS(spent)}.`}>
                  <Input name="total" type="number" inputMode="decimal" step="any" min="0" defaultValue={split ? total : spent} />
                </Field>
              )}
              <Field label="¿A quién le pagan?">
                <MemberSelect name="payer_member_id" members={members.filter((m) => !m.is_child)} allowNone={false} defaultValue={split?.payer_member_id ?? currentMemberId ?? ""} />
              </Field>
              <Field label="Alias, CBU o link de pago (opcional)" hint="Se muestra a todos los que vean el link, para que sepan adónde transferir.">
                <Textarea name="payment_info" rows={2} defaultValue={split?.payment_info ?? ""} placeholder="alias.mp.naza, o mpago.la/xxxxx" />
              </Field>
              <Field label="Quiénes participan">
                <div className="flex flex-col gap-1.5">
                  {eligible.map((g) => {
                    const existing = shares.find((s) => s.guest_id === g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-3 py-1">
                        <input
                          type="checkbox"
                          checked={picked.has(g.id)}
                          onChange={(e) =>
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(g.id);
                              else next.delete(g.id);
                              return next;
                            })
                          }
                          className="h-5 w-5 accent-coral"
                        />
                        <span className="min-w-0 flex-1 text-item text-ink">{g.name}</span>
                        {method === "manual" && picked.has(g.id) && (
                          <Input
                            name={`amount-${g.id}`}
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            className="!w-28"
                            defaultValue={existing?.amount ?? ""}
                            placeholder="0"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </Field>
              <button type="submit" disabled={busy === "save" || picked.size === 0} className="lb-btn disabled:opacity-50">
                {busy === "save" ? "Guardando…" : "Guardar división"}
              </button>
            </>
          )}
        </form>
      </BottomSheet>

      {/* ¿Cómo te pagó? — un toque y queda marcado, con el reintegro en Finanzas */}
      <BottomSheet open={!!paying} onClose={() => setPaying(null)} title={paying ? `${paying.guest.name} te pagó` : ""}>
        {paying && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-ink-soft">
              {formatARS(Number(paying.amount))}. Se suma como reintegro en tus Finanzas. ¿Cómo te llegó?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Transferencia", "Efectivo", "Mercado Pago", "Otro"].map((how) => (
                <button
                  key={how}
                  type="button"
                  disabled={busy === paying.id}
                  onClick={() => {
                    const share = paying;
                    setPaying(null);
                    run(share.id, () => markShareStatus({ eventId: event.id, shareId: share.id, status: "pagado", paidNote: how === "Otro" ? null : how }), `Listo: ${share.guest.name} pagó`);
                  }}
                  className="min-h-12 rounded-md border-[1.5px] border-line bg-surface text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {how}
                </button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
