"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Cake, Camera } from "lucide-react";
import type { Contact } from "@/lib/types";
import { archiveContact, saveContact, setContactPhoto } from "@/app/actions/contacts";
import { createClient } from "@/lib/supabase/client";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { Field, Input, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatDay } from "@/lib/format";
import { CIRCLE_SUGGESTIONS } from "@/lib/roles";

export function ContactsList({ contacts, householdId }: { contacts: Contact[]; householdId: string }) {
  const router = useRouter();
  const sheet = useSheet<Contact>();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(() =>
      saveContact({
        id: sheet.editing?.id,
        name: f.str("name"),
        relationship: f.opt("relationship"),
        birthday: f.opt("birthday"),
        phone: f.opt("phone"),
        email: f.opt("email"),
        notes: f.opt("notes"),
        is_child: f.bool("is_child"),
      })
    );
  }

  async function onPhoto(file: File) {
    if (!sheet.editing) return;
    setUploading(true);
    setPhotoError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${householdId}/circulo/${sheet.editing.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await setContactPhoto(sheet.editing.id, data.publicUrl);
      router.refresh();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "No pudimos subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {contacts.length === 0 && (
          <p className="font-accent text-2xl text-ink-faint">
            Todavía no cargaste a nadie. Sumá familiares y amigos: van a aparecer como sugerencia al invitar gente a un evento.
          </p>
        )}
        {contacts.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => sheet.openEdit(c)} className="lb-card flex w-full items-center gap-3 !p-3 text-left">
              {c.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photo_url} alt={c.name} className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info-soft font-display text-lg font-bold text-info">
                  {c.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-item font-medium text-ink">{c.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-meta text-ink-faint">
                  {c.relationship && <span>{c.relationship}</span>}
                  {c.birthday && (
                    <span className="inline-flex items-center gap-1">
                      <Cake size={11} /> {formatDay(c.birthday, "d 'de' MMM")}
                    </span>
                  )}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Fab onClick={sheet.openNew} label="Agregar al círculo" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? sheet.editing.name : "Nueva persona"}>
        {sheet.editing && (
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={uploading}
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-info-soft"
            >
              {sheet.editing.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sheet.editing.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera size={20} className="text-info" />
              )}
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPhoto(file);
              }}
            />
            <p className="text-meta text-ink-faint">{uploading ? "Subiendo foto…" : "Tocá para poner o cambiar la foto"}</p>
          </div>
        )}
        {photoError && <p className="mb-2 text-sm text-danger">{photoError}</p>}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input name="name" required autoFocus={!sheet.editing} defaultValue={sheet.editing?.name ?? ""} placeholder="Tía Karen, Brian…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relación" hint="Tía, amigo, lo que sea.">
              <Input name="relationship" list="lb-circle-relationship" defaultValue={sheet.editing?.relationship ?? ""} maxLength={30} />
              <datalist id="lb-circle-relationship">
                {CIRCLE_SUGGESTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Field>
            <Field label="Cumpleaños">
              <Input name="birthday" type="date" defaultValue={sheet.editing?.birthday ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <Input name="phone" type="tel" defaultValue={sheet.editing?.phone ?? ""} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" defaultValue={sheet.editing?.email ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="is_child" defaultChecked={sheet.editing?.is_child ?? false} className="h-5 w-5 accent-coral" />
            <span className="text-item text-ink">Es menor</span>
          </label>
          <Field label="Notas" hint="Alergias, ideas de regalo, lo que haga falta.">
            <Textarea name="notes" defaultValue={sheet.editing?.notes ?? ""} rows={2} />
          </Field>
          {sheet.error && <p className="text-sm text-danger">{sheet.error}</p>}
          <SubmitRow
            saving={sheet.saving}
            submitLabel={sheet.editing ? "Guardar" : "Agregar"}
            onDelete={
              sheet.editing
                ? () => {
                    if (confirm(`¿Sacar a ${sheet.editing!.name} del círculo? Los eventos pasados donde participó no se tocan.`)) {
                      sheet.run(() => archiveContact(sheet.editing!.id));
                    }
                  }
                : undefined
            }
          />
        </form>
      </BottomSheet>
    </>
  );
}
