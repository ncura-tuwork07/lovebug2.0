import { notFound } from "next/navigation";
import { Check, Circle, Wallet } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatARS, formatDay } from "@/lib/format";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

type Row = {
  payment_info: string | null;
  family_events: { title: string; event_date: string; location: string | null } | null;
  family_members: { name: string; nickname: string | null } | null;
  event_split_shares: { amount: number; status: "pendiente" | "pagado"; event_guests: { name: string } | null }[];
};

// Página pública de solo lectura: para que alguien sin cuenta vea cuánto le toca pagar de un
// evento y a qué alias/link mandarlo. No permite marcar nada — eso se hace desde adentro de la app.
export default async function PagarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data } = await admin
    .from("event_splits")
    .select("payment_info, family_events(title, event_date, location), family_members(name, nickname), event_split_shares(amount, status, event_guests(name))")
    .eq("share_token", token)
    .maybeSingle();
  if (!data) notFound();

  const row = data as unknown as Row;
  const event = row.family_events;
  const payer = row.family_members;
  const shares = row.event_split_shares ?? [];
  const total = shares.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-5 py-10">
      <div className="text-center">
        <Logo size={40} className="mx-auto" />
        <p className="mt-2 font-display text-lg font-bold">
          <span className="text-ink">Love</span>
          <span className="text-coral">bug</span>
        </p>
      </div>

      <div className="lb-card text-center">
        <p className="text-label font-display uppercase tracking-wider text-ink-ghost">División de gastos</p>
        <h1 className="mt-1 font-display text-h1 font-bold text-ink">{event?.title ?? "Evento"}</h1>
        {event?.event_date && (
          <p className="mt-1 text-meta text-ink-faint">
            {formatDay(event.event_date, "EEEE d 'de' MMMM")}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        )}
        <p className="mt-4 font-display text-display font-bold text-ink">{formatARS(total)}</p>
        <p className="text-meta text-ink-faint">a repartir{payer ? ` · le pagan a ${payer.nickname ?? payer.name}` : ""}</p>
      </div>

      {row.payment_info && (
        <div className="lb-card !bg-amber-soft">
          <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-amber">
            <Wallet size={16} /> Para pagar
          </h2>
          <p className="whitespace-pre-line text-body text-ink">{row.payment_info}</p>
        </div>
      )}

      <div className="lb-card">
        <ul className="flex flex-col divide-y divide-line">
          {shares.map((s, i) => (
            <li key={i} className="flex items-center gap-2 py-2.5">
              {s.status === "pagado" ? <Check size={18} className="text-success" /> : <Circle size={18} className="text-line" />}
              <span className={`flex-1 text-item ${s.status === "pagado" ? "text-ink-ghost line-through" : "text-ink"}`}>{s.event_guests?.name ?? "—"}</span>
              <span className="font-semibold text-ink">{formatARS(Number(s.amount))}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-meta text-ink-faint">
        Cuando pagues, avisale a quien organizó para que lo marque. Esta página se actualiza sola.
      </p>
    </div>
  );
}
