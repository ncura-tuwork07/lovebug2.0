import Link from "next/link";
import { Settings } from "lucide-react";
import { getSessionContext } from "@/lib/data";
import { enabledModules } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function MasPage() {
  const { household } = await getSessionContext();
  // Los que ya tienen pestaña propia no se repiten acá.
  const modules = enabledModules(household?.settings).filter((m) => !["calendario", "finanzas", "logistica"].includes(m.key));

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      <header>
        <p className="text-sm text-coral">Todo lo demás</p>
        <h1 className="text-h1 font-display font-bold text-ink">Más</h1>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {modules.map(({ key, href, label, desc, icon: Icon, color }) => (
          <li key={key}>
            <Link href={href} className="lb-card flex h-full flex-col gap-2 !p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
                <Icon size={20} />
              </span>
              <span className="font-display text-item font-semibold text-ink">{label}</span>
              <span className="text-meta text-ink-faint">{desc}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/ajustes" className="lb-card flex h-full flex-col gap-2 !p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-cream">
              <Settings size={20} />
            </span>
            <span className="font-display text-item font-semibold text-ink">Ajustes</span>
            <span className="text-meta text-ink-faint">Hogar, invitación, módulos y avisos</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
