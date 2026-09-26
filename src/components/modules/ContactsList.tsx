"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Cake, Camera } from "lucide-react";
import type { Contact } from "@/lib/types";
import { archiveContact, saveContact, setContactPhoto } from "@/app/actions/contacts";
import { createClient } from "@/lib/supabase/client";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Fab } from "@/components/ui/Fab";
import { BoolToggle, Field, Input, RolePicker, SubmitRow, Textarea } from "@/components/ui/Field";
import { fd, useSheet } from "@/components/ui/useSheet";
import { formatDay, todayAR } from "@/lib/format";
import { CIRCLE_SUGGESTIONS, isMinor } from "@/lib/roles";

export function ContactsList({ contacts, householdId }: { contacts: Contact[]; householdId: string }) {
  const router = useRouter();
  const sheet = useSheet<Contact>();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null); // de alguien nuevo: se sube al guardar
  const [isChild, setIsChild] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  function openSheet(c: Contact | null) {
    setNotice(null);
    setPreview(c?.photo_url ?? null);
    setPendingPhoto(null);
    setPhotoError(null);
    setIsChild(c?.is_child ?? false);
    if (c) sheet.openEdit(c);
    else sheet.openNew();
  }

  async function uploadPhoto(contactId: string, file: File): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${householdId}/circulo/${contactId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw new Error(upErr.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await setContactPhoto(contactId, data.publicUrl);
    return data.publicUrl;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    sheet.run(async () => {
      const id = await saveContact({
        id: sheet.editing?.id,
        name: f.str("name"),
        relationship: f.opt("relationship"),
        birthday: f.opt("birthday"),
        phone: f.opt("phone"),
        email: f.opt("email"),
        notes: f.opt("notes"),
        is_child: f.bool("is_child"),
      });
      if (pendingPhoto) {
        // La persona ya quedó guardada: si la foto falla no dejamos el form abierto (se duplicaría).
        await uploadPhoto(id, pendingPhoto).catch(() => setNotice("Quedó guardada, pero la foto no se pudo subir. Entrá a su ficha y probá de nuevo."));
      }
    });
  }

  // Cámara o galería (sin `capture`, así el celu ofrece las dos). A alguien que ya está se le sube
  // en el momento; a alguien nuevo se le muestra y se sube cuando se guarda.
  async function onPhoto(file: File) {
    setPhotoError(null);
    if (!sheet.editing) {
      setPendingPhoto(file);
      setPreview(URL.createObjectURL(file));
      return;
    }
    setUploading(true);
    try {
      setPreview(await uploadPhoto(sheet.editing.id, file));
      router.refresh();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "No pudimos subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {notice && <p className="rounded-md bg-amber-soft px-3 py-2 text-sm text-ink">{notice}</p>}
      <ul className="flex flex-col gap-2">
        {contacts.length === 0 && (
          <li className="font-accent text-2xl text-ink-faint">
            Todavía no cargaste a nadie. Sumá familiares y amigos: van a aparecer como sugerencia al invitar gente a un evento.
          </li>
        )}
        {contacts.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => openSheet(c)} className="lb-card flex w-full items-center gap-3 !p-3 text-left">
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

      <Fab onClick={() => openSheet(null)} label="Agregar al círculo" />

      <BottomSheet open={sheet.open} onClose={sheet.close} title={sheet.editing ? sheet.editing.name : "Nueva persona"}>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            disabled={uploading}
            aria-label="Elegir foto"
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-info-soft"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
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
              e.target.value = "";
              if (file) onPhoto(file);
            }}
          />
          <p className="text-meta text-ink-faint">
            {uploading ? "Subiendo foto…" : preview ? "Tocá la foto para cambiarla" : "Tocá para ponerle una foto (de la cámara o la galería)"}
          </p>
        </div>
        {photoError && <p className="mb-2 text-sm text-danger">{photoError}</p>}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input name="name" required autoFocus={!sheet.editing} defaultValue={sheet.editing?.name ?? ""} placeholder="Tía Karen, Brian…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Qué es de ustedes">
              <RolePicker key={sheet.editing?.id ?? "new"} name="relationship" options={CIRCLE_SUGGESTIONS} defaultValue={sheet.editing?.relationship ?? ""} placeholder="Sin especificar" />
            </Field>
            <Field label="Cumpleaños">
              <Input
                name="birthday"
                type="date"
                defaultValue={sheet.editing?.birthday ?? ""}
                onChange={(e) => {
                  const minor = isMinor(e.target.value, todayAR());
                  if (minor !== null) setIsChild(minor);
                }}
              />
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
          <Field group label="¿Es menor de edad?" hint="Con el cumple se marca solo.">
            <BoolToggle name="is_child" value={isChild} onChange={setIsChild} falseLabel="No" trueLabel="Sí, es menor" />
          </Field>
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
