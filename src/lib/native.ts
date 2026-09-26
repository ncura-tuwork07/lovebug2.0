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
type PushPermission = "prompt" | "prompt-with-rationale" | "granted" | "denied";
type Listener = { remove(): Promise<void> };
type PushNotifications = {
  checkPermissions(): Promise<{ receive: PushPermission }>;
  requestPermissions(): Promise<{ receive: PushPermission }>;
  register(): Promise<void>;
  unregister(): Promise<void>;
  createChannel(channel: { id: string; name: string; description?: string; importance?: number; vibration?: boolean; lightColor?: string }): Promise<void>;
  addListener(event: "registration", cb: (t: { value: string }) => void): Listener;
  addListener(event: "registrationError", cb: (e: { error: string }) => void): Listener;
  addListener(event: "pushNotificationActionPerformed", cb: (a: { notification?: { data?: Record<string, unknown> } }) => void): Listener;
};
type CapacitorGlobal = { isNativePlatform?: () => boolean; Plugins?: { NativeBiometric?: NativeBiometric; PushNotifications?: PushNotifications } };

const SERVER = "lovebug"; // nombre bajo el que el celu guarda el secreto
const ACCESS_BIOMETRY_CURRENT_SET = 1; // se invalida si agregan una huella nueva al celu (como los bancos)
const DEVICE_KEY = "lb-native-device"; // id del dispositivo en la cuenta, para poder apagarlo

function capacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() ? cap : null;
}
const plugin = (): NativeBiometric | null => capacitor()?.Plugins?.NativeBiometric ?? null;

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

// ── Avisos en la app (Firebase) ──────────────────────────────────────────────────────────────
// Solo si la app se compiló con Firebase (lo marca "LovebugPush" en el user agent): sin eso,
// pedirle el token a Firebase cierra la app.
function pushPlugin(): PushNotifications | null {
  if (typeof navigator === "undefined" || !navigator.userAgent.includes("LovebugPush")) return null;
  return capacitor()?.Plugins?.PushNotifications ?? null;
}

export const nativePushAvailable = () => pushPlugin() !== null;
// Hay app pero sin Firebase adentro (una versión vieja, o todavía no configurado).
export const nativeAppWithoutPush = () => capacitor() !== null && pushPlugin() === null;

const NATIVE_PUSH_KEY = "lb-native-push"; // el token de este celu, si los avisos están activados acá
export const NATIVE_PUSH_CHANNEL = "avisos";

export function nativePushToken(): string | null {
  try {
    return localStorage.getItem(NATIVE_PUSH_KEY);
  } catch {
    return null;
  }
}

export async function nativePushPermission(): Promise<"granted" | "denied" | "prompt"> {
  const p = pushPlugin();
  if (!p) return "denied";
  const { receive } = await p.checkPermissions();
  return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
}

// Pide permiso (Android 13+ muestra el cartel), crea el canal y devuelve el token de Firebase.
export async function registerNativePush(): Promise<string> {
  const p = pushPlugin();
  if (!p) throw new Error("Esta versión de la app no tiene avisos. Bajá la última desde Ajustes.");
  let { receive } = await p.checkPermissions();
  if (receive !== "granted") receive = (await p.requestPermissions()).receive;
  if (receive !== "granted") throw Object.assign(new Error("Sin permiso para avisos."), { code: "denied" });
  await p.createChannel({ id: NATIVE_PUSH_CHANNEL, name: "Avisos de Lovebug", description: "Vencimientos, traslados, cumples y el resumen del domingo", importance: 4, vibration: true, lightColor: "#FF5A5F" }).catch(() => {});

  const token = await new Promise<string>((resolve, reject) => {
    const listeners: Listener[] = [];
    const done = () => listeners.forEach((l) => l.remove().catch(() => {}));
    const timer = setTimeout(() => {
      done();
      reject(new Error("Firebase no respondió. Revisá la conexión y probá de nuevo."));
    }, 20_000);
    listeners.push(
      p.addListener("registration", ({ value }) => {
        clearTimeout(timer);
        done();
        resolve(value);
      }),
      p.addListener("registrationError", ({ error }) => {
        clearTimeout(timer);
        done();
        reject(new Error(error || "No pudimos registrar el celu para avisos."));
      })
    );
    p.register().catch((e) => {
      clearTimeout(timer);
      done();
      reject(e);
    });
  });
  return token;
}

// Se guarda recién cuando el servidor ya tiene el token: así "activado" siempre es verdad.
export function rememberNativePush(token: string) {
  try {
    localStorage.setItem(NATIVE_PUSH_KEY, token);
  } catch {}
}

export async function unregisterNativePush(): Promise<string | null> {
  const token = nativePushToken();
  try {
    localStorage.removeItem(NATIVE_PUSH_KEY);
  } catch {}
  await pushPlugin()?.unregister().catch(() => {});
  return token;
}

// Al tocar un aviso, la app se abre (o vuelve) y nos pasa la pantalla a la que lleva.
export function onNativePushTap(go: (url: string) => void): () => void {
  const p = pushPlugin();
  if (!p) return () => {};
  const l = p.addListener("pushNotificationActionPerformed", (a) => {
    const url = a.notification?.data?.url;
    if (typeof url === "string" && url.startsWith("/")) go(url);
  });
  return () => void l.remove().catch(() => {});
}
