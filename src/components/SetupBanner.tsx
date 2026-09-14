import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export function SetupBanner() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm text-ink">
      <strong>Modo demo.</strong> Estás viendo datos de ejemplo. Conectá tu
      proyecto de Supabase en <code className="rounded bg-white px-1 py-0.5">.env.local</code> (copiá{" "}
      <code className="rounded bg-white px-1 py-0.5">.env.local.example</code>) y corré{" "}
      <code className="rounded bg-white px-1 py-0.5">supabase/schema.sql</code> para guardar datos reales.
    </div>
  );
}
