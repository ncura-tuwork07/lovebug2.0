import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente con service role: solo para procesos del servidor sin sesión (cron, push).
// Nunca importar desde componentes de cliente.
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
