import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// ¿Es uno de los administradores de la app (Naza y Jaz)? Se consulta con service role
// porque app_admins no tiene políticas RLS.
export async function isAppAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}
