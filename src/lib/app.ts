// URL pública de la app (para los links de "pagar", del calendario y de los emails).
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://lovebug20.vercel.app").replace(/\/$/, "");

// Link público de solo lectura para ver una división de gastos (sin necesitar cuenta).
export function payLink(token: string, origin?: string) {
  return `${origin ?? APP_URL}/pagar/${token}`;
}
