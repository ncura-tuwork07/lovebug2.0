"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import type { EventAttachment, FamilyEvent } from "@/lib/types";
import { addEventAttachment, deleteEventAttachment, setEventMemoryNote } from "@/app/actions/familyEvents";
import { Textarea } from "@/components/ui/Field";
import { SectionTitle, uploadEventFile, useRun } from "./shared";

export type AttachmentWithUrl = EventAttachment & { url: string | null };

export function EventMemories({ event, photos, householdId }: { event: FamilyEvent; photos: AttachmentWithUrl[]; householdId: string }) {
  const { busy, msg, run } = useRun();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(event.memory_note ?? "");
  const [open, setOpen] = useState<AttachmentWithUrl | null>(null);
  const isPast = event.status === "done";

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 10);
    await run("upload", async () => {
      for (const file of list) {
        const path = await uploadEventFile(householdId, event.id, "foto", file);
        await addEventAttachment(event.id, { kind: "foto", title: null, file_path: path, mime_type: file.type || null });
      }
      return list.length;
    }, "{n} fotos guardadas");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="lb-card">
      <SectionTitle
        icon={<Camera size={16} />}
        color="#EC4899"
        action={
          <button
            type="button"
            disabled={busy === "upload"}
            onClick={() => fileRef.current?.click()}
            className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-line/60 px-3 text-xs font-semibold text-ink disabled:opacity-50"
          >
            <Camera size={14} /> {busy === "upload" ? "Subiendo…" : "Fotos"}
          </button>
        }
      >
        Recuerdos
      </SectionTitle>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      {photos.length === 0 && (
        <p className="text-body text-ink-faint">
          {isPast ? "Subí las fotos y escribí cómo salió: queda como recuerdo del evento." : "Después del evento, subí las fotos y anotá cómo salió. Queda guardado para siempre."}
        </p>
      )}
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-line">
              {p.url && (
                <button type="button" onClick={() => setOpen(p)} className="h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.title ?? "Foto del evento"} className="h-full w-full object-cover" loading="lazy" />
                </button>
              )}
              <button
                type="button"
                aria-label="Borrar foto"
                onClick={() => {
                  if (confirm("¿Borramos esta foto?")) run(p.id, () => deleteEventAttachment(event.id, p.id));
                }}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-white"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isPast ? "Cómo salió, qué sobró, qué haríamos distinto, quién se robó la fiesta…" : "Notas para el recuerdo (se completan después del evento)."}
          aria-label="Nota de recuerdo"
        />
        {note.trim() !== (event.memory_note ?? "").trim() && (
          <button
            type="button"
            disabled={busy === "note"}
            onClick={() => run("note", () => setEventMemoryNote(event.id, note), "Recuerdo guardado")}
            className="lb-btn mt-2 min-h-10 !py-2 text-sm disabled:opacity-50"
          >
            Guardar recuerdo
          </button>
        )}
      </div>
      {msg && <p className="mt-1 text-sm text-ink-soft">{msg}</p>}

      {open?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4" role="dialog" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.url} alt={open.title ?? "Foto"} className="max-h-full max-w-full rounded-md object-contain" />
        </div>
      )}
    </section>
  );
}
