import "server-only";
import { headers } from "next/headers";
import { APP_URL } from "@/lib/app";

export const RP_NAME = "Lovebug";

// Minutos que un desafío de passkey (registro o login) sigue siendo válido.
export const PASSKEY_CHALLENGE_TTL_MINUTES = 5;

// El origin real de este pedido (así funciona igual en localhost que en producción).
// Cae a APP_URL si el navegador no lo mandó (no debería pasar en un form/fetch normal).
export async function getOrigin(): Promise<string> {
  const h = await headers();
  return h.get("origin") || APP_URL;
}

export async function getRpID(): Promise<string> {
  return new URL(await getOrigin()).hostname;
}
