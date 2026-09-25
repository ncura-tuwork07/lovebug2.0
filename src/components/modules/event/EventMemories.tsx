"use client";

import { useRef, useState } from "react";
import { Camera, Music, Play, Trash2 } from "lucide-react";
import type { AttachmentKind, EventAttachment, FamilyEvent } from "@/lib/types";
import { addEventAttachment, deleteEventAttachment, setEventMemoryNote } from "@/app/actions/familyEvents";
import { Textarea } from "@/components/ui/Field";
import { SectionTitle, uploadEventFile, useRun } from "./shared";

export type AttachmentWithUrl = EventAttachment & { url: string | null };

function kindFor(file: File): AttachmentKind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "foto";
}

export function EventMemories({ event, photos, householdId }: { event: FamilyEvent; photos: AttachmentWithUrl[]; householdId: string }) {
  const { busy, msg, run } = useRun();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState(event.memory_note ?? "");
  const [open, setOpen] = useState<AttachmentWithUrl | null>(null);
  const isPast = event.status === "done";

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 10);
    await run(
      "upload",
      async () => {
        for (const file of list) {
          const kind = kindFor(file);
          const path = await uploadEventFile(householdId, event.id, kind, file);
          await addEventAttachment(event.id, { kind, title: null, file_path: path, mime_type: file.type || null, size_bytes: file.size });
        }
        return list.length;
      },
      "{n} recuerdos guardados"
    );
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
            <Camera size={14} /> {busy === "upload" ? "Subiendo…" : "Fotos y videos"}
          </button>
        }
      >
        Recuerdos
      </SectionTitle>
      <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      {photos.length === 0 && (
        <p className="text-body text-ink-faint">
          {isPast
            ? "Subí fotos, videos o audios y escribí cómo salió: queda como recuerdo del evento."
            : "Después del evento, subí fotos, videos o audios y anotá cómo salió. Queda guardado para siempre."}
        </p>
      )}
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-line">
              {p.url && p.kind === "foto" && (
                <button type="button" onClick={() => setOpen(p)} className="h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.title ?? "Foto del evento"} className="h-full w-full object-cover" loading="lazy" />
                </button>
              )}
              {p.url && p.kind === "video" && (
                <button type="button" onClick={() => setOpen(p)} className="relative h-full w-full">
                  <video src={p.url} className="h-full w-full object-cover" muted preload="metadata" />
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/20">
                    <Play size={22} className="fill-white text-white" />
                  </span>
                </button>
              )}
              {p.url && p.kind === "audio" && (
                <button type="button" onClick={() => setOpen(p)} className="flex h-full w-full flex-col items-center justify-center gap-1 bg-info-soft">
                  <Music size={22} className="text-info" />
                  <span className="px-1 text-center text-[11px] font-semibold text-info">Audio</span>
                </button>
              )}
              <button
                type="button"
                aria-label="Borrar recuerdo"
                onClick={() => {
                  if (confirm("¿Borramos este recuerdo?")) run(p.id, () => deleteEventAttachment(event.id, p.id));
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
          {open.kind === "video" && (
            <video src={open.url} controls autoPlay className="max-h-full max-w-full rounded-md" onClick={(e) => e.stopPropagation()} />
          )}
          {open.kind === "audio" && (
            <div className="w-full max-w-xs rounded-card bg-surface p-6" onClick={(e) => e.stopPropagation()}>
              <p className="mb-3 flex items-center justify-center gap-2 text-item font-semibold text-ink">
                <Music size={18} /> Audio del evento
              </p>
              <audio src={open.url} controls autoPlay className="w-full" />
            </div>
          )}
          {open.kind === "foto" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={open.url} alt={open.title ?? "Foto"} className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </section>
  );
}
