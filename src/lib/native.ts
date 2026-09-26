"use client";

// Puente con la app Android de Lovebug (Capacitor). La app abre esta misma web y le agrega
// window.Capacitor con sus plugins; en el navegador no existe y todo sigue como siempre.

type Credentials = { username: string; password: string };
type NativeBiometric = {
  isAvailable(options?: { useFallback: boolean }): Promise<{ isAvailable: boolean; errorCode?: number }>;
  setCredentials(options: { username: string; password: string; server: string; accessControl?: number; title?: string; negativeButtonText?: string }): Promise<void>;
  getSecureCredentials(options: { server: string; reason?: string; title?: string; subtitle?: string; negativeButtonText?: string }): Promise<Credentials>;
  isCredentialsSaved(options: { server: string }): Promise<{ isSaved: boolean }>;
  deleteCredentials(options: { server: string }): Promise<void>;
};
type CapacitorGlobal = { isNativePlatform?: () => boolean; Plugins?: { NativeBiometric?: NativeBiometric } };

const SERVER = "lovebug"; // nombre bajo el que el celu guarda el secreto
const ACCESS_BIOMETRY_CURRENT_SET = 1; // se invalida si agregan una huella nueva al celu (como los bancos)
const DEVICE_KEY = "lb-native-device"; // id del dispositivo en la cuenta, para poder apagarlo

function plugin(): NativeBiometric | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() ? (cap.Plugins?.NativeBiometric ?? null) : null;
}

export const isNativeApp = () => plugin() !== null;

// ¿El celu tiene huella (o cara) cargada para usar?
export async function nativeBiometricAvailable(): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    return (await p.isAvailable({ useFallback: false })).isAvailable;
  } catch {
    return false;
  }
}

export async function nativeUnlockSaved(): Promise<boolean> {
  const p = plugin();
  if (!p) return false;
  try {
    return (await p.isCredentialsSaved({ server: SERVER })).isSaved;
  } catch {
    return false;
  }
}

// Guarda el secreto detrás de la huella (el celu la pide una vez para protegerlo).
export async function saveNativeUnlock(userId: string, token: string, deviceId: string): Promise<void> {
  const p = plugin();
  if (!p) throw new Error("Esto funciona en la app de Lovebug para Android.");
  await p.setCredentials({ username: userId, password: token, server: SERVER, accessControl: ACCESS_BIOMETRY_CURRENT_SET, title: "Activar la huella en Lovebug", negativeButtonText: "Cancelar" });
  try {
    localStorage.setItem(DEVICE_KEY, deviceId);
  } catch {}
}

// Muestra el cartel de huella del celu y, si sale bien, devuelve lo guardado.
export async function readNativeUnlock(): Promise<{ userId: string; token: string }> {
  const p = plugin();
  if (!p) throw new Error("Esto funciona en la app de Lovebug para Android.");
  const c = await p.getSecureCredentials({ server: SERVER, title: "Lovebug", subtitle: "Poné tu huella para entrar", reason: "Poné tu huella para entrar", negativeButtonText: "Usar contraseña" });
  return { userId: c.username, token: c.password };
}

export async function forgetNativeUnlock(): Promise<string | null> {
  const p = plugin();
  let deviceId: string | null = null;
  try {
    deviceId = localStorage.getItem(DEVICE_KEY);
    localStorage.removeItem(DEVICE_KEY);
  } catch {}
  await p?.deleteCredentials({ server: SERVER }).catch(() => {});
  return deviceId;
}

export const nativeDeviceId = () => {
  try {
    return localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
};

// Canceló el cartel (tocó "Usar contraseña" o atrás): no es un error para mostrar.
export function isNativeCancel(e: unknown): boolean {
  const code = String((e as { code?: unknown })?.code ?? "");
  const msg = String((e as { message?: unknown })?.message ?? "").toLowerCase();
  return ["11", "13", "15", "16"].includes(code) || msg.includes("cancel");
}
