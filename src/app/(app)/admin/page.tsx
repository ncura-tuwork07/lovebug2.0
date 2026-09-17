import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ChevronLeft, Download, Home, ShieldCheck, Smartphone, Users } from "lucide-react";
import { getSessionContext } from "@/lib/data";
import { isAppAdmin } from "@/lib/admin";
import { getAdminMetrics } from "@/lib/metrics";
import { formatDay } from "@/lib/format";

export const dynamic = "force-dynamic";

function relative(iso: string | null): string {
  if (!iso) return "nunca";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return formatDay(iso.slice(0, 10), "d MMM yy");
}

function Stat({ icon: Icon, label, value, hint, color }: { icon: typeof Users; label: string; value: number; hint?: string; color: string }) {
  return (
    <div className="lb-card flex flex-col gap-1 !p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
        <Icon size={16} />
      </span>
      <span className="font-display text-3xl font-bold text-ink">{value}</span>
      <span className="text-meta font-semibold text-ink-soft">{label}</span>
      {hint && <span className="text-meta text-ink-faint">{hint}</span>}
    </div>
  );
}

export default async function AdminPage() {
  const { user } = await getSessionContext();
  if (!(await isAppAdmin(user?.id))) notFound();
  const m = await getAdminMetrics();
  if (!m) return <p className="px-4 pt-6 text-body text-ink-soft">Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.</p>;
  const maxEvents = Math.max(1, ...m.modules.map((x) => x.events));

  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      <Link href="/ajustes" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-faint">
        <ChevronLeft size={18} /> Ajustes
      </Link>
      <header>
        <p className="flex items-center gap-1 text-sm text-coral">
          <ShieldCheck size={14} /> Solo Naza y Jaz
        </p>
        <h1 className="text-h1 font-display font-bold text-ink">Panel de admin</h1>
        <p className="mt-1 text-body text-ink-soft">Métricas agregadas de uso. No se ven datos de ningún hogar.</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Stat icon={Home} label="Hogares" value={m.households} hint={`${m.newHouseholds30} nuevos en 30 días`} color="#FF5A5F" />
        <Stat icon={Users} label="Cuentas" value={m.users} hint={`${m.active30} activas en 30 días`} color="#3B82F6" />
        <Stat icon={Activity} label="Activos 7 días" value={m.active7} hint={`${m.householdsActive7} hogares`} color="#10B981" />
        <Stat icon={Download} label="Instalaciones" value={m.installs} hint="Abrieron la app instalada" color="#8B5CF6" />
        <Stat icon={Smartphone} label="Dispositivos con avisos" value={m.pushDevices} color="#F59E0B" />
      </section>

      <section className="lb-card">
        <h2 className="text-h2 mb-3 font-display uppercase tracking-wide text-info">Módulos más usados · 30 días</h2>
        <ul className="flex flex-col gap-2.5">
          {m.modules.map((row) => (
            <li key={row.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{row.label}</span>
                <span className="text-meta text-ink-faint">
                  {row.events} visitas · {row.users} {row.users === 1 ? "persona" : "personas"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full" style={{ width: `${Math.round((row.events / maxEvents) * 100)}%`, backgroundColor: row.color }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="lb-card">
        <h2 className="text-h2 mb-3 font-display uppercase tracking-wide text-coral">Hogares</h2>
        <ul className="flex flex-col divide-y divide-line">
          {m.households_list.map((h) => (
            <li key={h.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{h.name}</span>
                <span className="text-meta text-ink-faint">desde {formatDay(h.created_at.slice(0, 10), "d MMM yy")}</span>
              </div>
              <p className="text-meta text-ink-faint">
                {h.members} {h.members === 1 ? "integrante" : "integrantes"} · {h.accounts} con cuenta · {h.installs} instal. · {h.events30} visitas/30d ·
                último uso {relative(h.last_seen_at)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
