// URL pública de la app (para links de invitación y emails).
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://lovebug-wheat.vercel.app").replace(/\/$/, "");

export function inviteLink(code: string, origin?: string) {
  return `${origin ?? APP_URL}/invitacion/${code}`;
}
