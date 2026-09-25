"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Plus, Trash2 } from "lucide-react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { deletePasskey, getPasskeyRegistrationOptions, verifyPasskeyRegistration } from "@/app/actions/passkeys";
import type { UserPasskey } from "@/lib/types";

function guessDeviceLabel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  return "Este dispositivo";
}

export function PasskeysSection({ passkeys }: { passkeys: UserPasskey[] }) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<{ challengeId: string; response: Parameters<typeof verifyPasskeyRegistration>[0]["response"]; label: string } | null>(null);

  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  if (!supported) return null;

  async function addDevice() {
    setError(null);
    setBusy(true);
    try {
      const { options, challengeId } = await getPasskeyRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });
      setPendingLabel({ challengeId, response, label: guessDeviceLabel() });
    } catch (e) {
      if (e instanceof Error && e.name !== "NotAllowedError") setError(e.message || "No pudimos activarlo. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmLabel() {
    if (!pendingLabel) return;
    setError(null);
    setBusy(true);
    try {
      await verifyPasskeyRegistration({ challengeId: pendingLabel.challengeId, response: pendingLabel.response, deviceLabel: pendingLabel.label });
      setPendingLabel(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardarlo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Sacar este acceso? Ese dispositivo va a tener que usar email y contraseña.")) return;
    setError(null);
    setBusy(true);
    try {
      await deletePasskey(id);
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
        <Fingerprint size={16} /> Entrar con huella o cara
      </h2>
      <p className="mb-3 text-body text-ink-soft">Activalo en cada celu o compu para entrar sin escribir la contraseña, usando la huella, la cara o el PIN del dispositivo.</p>

      {error && <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {pendingLabel ? (
        <div className="flex flex-col gap-2">
          <label className="text-meta text-ink-faint">¿Cómo le decimos a este dispositivo?</label>
          <div className="flex gap-2">
            <input
              className="lb-input"
              value={pendingLabel.label}
              onChange={(e) => setPendingLabel({ ...pendingLabel, label: e.target.value })}
              maxLength={40}
              autoFocus
            />
            <button type="button" disabled={busy} onClick={confirmLabel} className="lb-btn shrink-0 !px-4 disabled:opacity-50">
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          {passkeys.length > 0 && (
            <ul className="mb-3 flex flex-col divide-y divide-line">
              {passkeys.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1">
                    <span className="block text-item font-semibold text-ink">{p.device_label || "Este dispositivo"}</span>
                    <span className="block text-meta text-ink-faint">{p.last_used_at ? `Usado por última vez ${new Date(p.last_used_at).toLocaleDateString("es-AR")}` : "Todavía sin usar"}</span>
                  </span>
                  <button type="button" disabled={busy} onClick={() => remove(p.id)} className="text-ink-ghost disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" disabled={busy} onClick={addDevice} className="flex min-h-11 items-center gap-2 rounded-md border-[1.5px] border-line px-4 text-sm font-semibold text-ink disabled:opacity-50">
            <Plus size={16} /> Agregar este dispositivo
          </button>
        </>
      )}
    </section>
  );
}
