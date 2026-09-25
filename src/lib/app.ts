// URL pública de la app (para links de invitación y emails).
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://lovebug-wheat.vercel.app").replace(/\/$/, "");

export function inviteLink(code: string, origin?: string) {
  return `${origin ?? APP_URL}/invitacion/${code}`;
}

// Link público de solo lectura para ver una división de gastos (sin necesitar cuenta).
export function payLink(token: string, origin?: string) {
  return `${origin ?? APP_URL}/pagar/${token}`;
}
