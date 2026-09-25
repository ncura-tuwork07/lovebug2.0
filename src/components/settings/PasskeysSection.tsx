"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Plus, Trash2 } from "lucide-react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { deletePasskey } from "@/app/actions/passkeys";
import { devicePasskeyId, forgetDevicePasskey, registerThisDevice } from "@/lib/passkeyClient";
import type { UserPasskey } from "@/lib/types";

export function PasskeysSection({ passkeys }: { passkeys: UserPasskey[] }) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [thisDeviceId, setThisDeviceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    setThisDeviceId(devicePasskeyId());
  }, []);

  if (!supported) return null;

  const activeHere = Boolean(thisDeviceId && passkeys.some((p) => p.id === thisDeviceId));

  async function addDevice() {
    setError(null);
    setBusy(true);
    try {
      await registerThisDevice();
      setThisDeviceId(devicePasskeyId());
      router.refresh();
    } catch (e) {
      if (!(e instanceof Error && e.name === "NotAllowedError")) setError(e instanceof Error ? e.message : "No pudimos activarla. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Sacar este acceso? Ese dispositivo va a tener que entrar con email y contraseña.")) return;
    setError(null);
    setBusy(true);
    try {
      await deletePasskey(id);
      forgetDevicePasskey(id);
      setThisDeviceId(devicePasskeyId());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos sacarlo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lb-card">
      <h2 className="text-h2 mb-1 flex items-center gap-2 font-display uppercase tracking-wide text-ink">
        <Fingerprint size={16} /> Entrar con huella
      </h2>
      <p className="mb-3 text-body text-ink-soft">
        Entrás sin escribir la contraseña, con la huella o el patrón de pantalla del celu. Se activa en cada dispositivo por separado.
      </p>

      {error && <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {passkeys.length > 0 && (
        <ul className="mb-3 flex flex-col divide-y divide-line">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1">
                <span className="block text-item font-semibold text-ink">
                  {p.device_label || "Dispositivo"}
                  {p.id === thisDeviceId && <span className="font-normal text-success"> · este celu</span>}
                </span>
                <span className="block text-meta text-ink-faint">
                  {p.last_used_at ? `Usada por última vez ${new Date(p.last_used_at).toLocaleDateString("es-AR")}` : "Todavía sin usar"}
                </span>
              </span>
              <button type="button" disabled={busy} onClick={() => remove(p.id)} aria-label="Sacar este acceso" className="flex h-9 w-9 items-center justify-center text-ink-ghost disabled:opacity-50">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!activeHere && (
        <button type="button" disabled={busy} onClick={addDevice} className="lb-btn flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? "Esperando tu huella…" : (
            <>
              <Plus size={16} /> Activar huella en este celu
            </>
          )}
        </button>
      )}
    </section>
  );
}
