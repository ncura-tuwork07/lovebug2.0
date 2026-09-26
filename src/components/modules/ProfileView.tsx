"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileText, MapPin, Paperclip, Trash2, Upload } from "lucide-react";
import type { DocumentKind, FamilyDocument, Member } from "@/lib/types";
import { addDocument, deleteDocument, setPhoto, setShareLocation, updateProfile } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { BoolToggle, Field, Input, RolePicker, Select, SubmitRow, Textarea } from "@/components/ui/Field";
import { MemberAvatar } from "@/components/ui/MemberChip";
import { fd } from "@/components/ui/useSheet";
import { formatDay, todayAR } from "@/lib/format";
import { isMinor, ROLE_SUGGESTIONS, shownRole } from "@/lib/roles";

export const DOC_KINDS: Record<DocumentKind, string> = {
  dni: "DNI",
  vacunas: "Carnet de vacunas",
  ficha_medica: "Ficha médica",
  colegio: "Colegio",
  seguro: "Seguro / obra social",
  otro: "Otro",
};

const PALETTE = ["#3B82F6", "#EC4899", "#FFB347", "#10B981", "#8B5CF6", "#0EA5A5", "#FF9F43", "#6366F1", "#EF4444", "#F59E0B"];

export function ProfileView({
  member,
  documents,
  isMe,
  householdId,
}: {
  member: Member;
  documents: (FamilyDocument & { url: string | null })[];
  isMe: boolean;
  householdId: string;
}) {
  const router = useRouter();
  const [color, setColor] = useState(member.color);
  const [isChild, setIsChild] = useState(member.is_child);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docKind, setDocKind] = useState<DocumentKind>("dni");
  const [docTitle, setDocTitle] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = fd(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        id: member.id,
        name: f.str("name"),
        role: f.str("role"),
        is_child: f.bool("is_child"),
        nickname: f.opt("nickname"),
        birthday: f.opt("birthday"),
        dni: f.opt("dni"),
        phone: f.opt("phone"),
        blood_type: f.opt("blood_type"),
        allergies: f.opt("allergies"),
        school: f.opt("school"),
        doctor: f.opt("doctor"),
        notes: f.opt("notes"),
        color,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file: File) {
    setUploadingPhoto(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${householdId}/${member.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await setPhoto(member.id, data.publicUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos subir la foto.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onDoc(file: File) {
    setUploadingDoc(true);
    setError(null);
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("El archivo es muy pesado (máximo 15 MB).");
      const supabase = createClient();
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${householdId}/${member.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      await addDocument({
        member_id: member.id,
        title: docTitle.trim() || DOC_KINDS[docKind],
        kind: docKind,
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      setDocTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos subir el documento.");
    } finally {
      setUploadingDoc(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Foto */}
      <section className="lb-card flex items-center gap-4">
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          disabled={uploadingPhoto}
          className="relative shrink-0"
          aria-label="Cambiar foto"
        >
          {member.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.photo_url} alt={member.name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <MemberAvatar member={member} size={80} />
          )}
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-coral text-white shadow-soft">
            <Camera size={15} />
          </span>
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
        />
        <div className="min-w-0">
          <p className="font-display text-h1 font-bold text-ink">{member.name}</p>
          {member.nickname && <p className="text-body text-ink-faint">“{member.nickname}”</p>}
          <p className="text-meta text-ink-faint">{uploadingPhoto ? "Subiendo foto…" : "Tocá la foto para cambiarla"}</p>
        </div>
      </section>

      {/* Ubicación (solo el propio perfil) */}
      {isMe && (
        <section className="lb-card flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
            <MapPin size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-item font-medium text-ink">Compartir mi ubicación</p>
            <p className="text-meta text-ink-faint">Mientras Lovebug esté abierta, el resto te ve en el Mapa.</p>
          </div>
          <input
            type="checkbox"
            role="switch"
            aria-label="Compartir mi ubicación"
            className="h-6 w-6 accent-coral"
            defaultChecked={member.share_location}
            onChange={async (e) => {
              await setShareLocation(member.id, e.target.checked);
              router.refresh();
            }}
          />
        </section>
      )}

      {/* Datos */}
      <form onSubmit={onSubmit} className="lb-card flex flex-col gap-4">
        <h2 className="text-h2 font-display uppercase tracking-wide text-coral">Datos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre">
            <Input name="name" required defaultValue={member.name} />
          </Field>
          <Field label="Apodo">
            <Input name="nickname" defaultValue={member.nickname ?? ""} placeholder="Pato, Coti…" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qué es en la familia">
            <RolePicker name="role" options={ROLE_SUGGESTIONS} defaultValue={shownRole(member.role)} required />
          </Field>
          <Field label="Cumpleaños">
            <Input
              name="birthday"
              type="date"
              defaultValue={member.birthday ?? ""}
              onChange={(e) => {
                const minor = isMinor(e.target.value, todayAR());
                if (minor !== null) setIsChild(minor);
              }}
            />
          </Field>
        </div>
        <Field group label="¿Es menor de edad?" hint="Los menores suman puntos y premios, y no aparecen en finanzas ni en el horóscopo.">
          <BoolToggle name="is_child" value={isChild} onChange={setIsChild} falseLabel="No" trueLabel="Sí, es menor" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="DNI">
            <Input name="dni" inputMode="numeric" defaultValue={member.dni ?? ""} />
          </Field>
          <Field label="Teléfono">
            <Input name="phone" type="tel" defaultValue={member.phone ?? ""} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grupo sanguíneo">
            <Select name="blood_type" defaultValue={member.blood_type ?? ""}>
              <option value="">—</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alergias / medicación">
            <Input name="allergies" defaultValue={member.allergies ?? ""} placeholder="Ninguna" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Colegio / trabajo">
            <Input name="school" defaultValue={member.school ?? ""} />
          </Field>
          <Field label="Médico / pediatra">
            <Input name="doctor" defaultValue={member.doctor ?? ""} />
          </Field>
        </div>
        <Field label="Notas (talles, gustos, lo que haga falta)">
          <Textarea name="notes" rows={3} defaultValue={member.notes ?? ""} />
        </Field>
        <Field group label="Color en la app">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className="h-9 w-9 rounded-full border-4"
                style={{ backgroundColor: c, borderColor: color === c ? "var(--color-ink)" : "transparent" }}
              />
            ))}
          </div>
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <SubmitRow saving={saving} />
      </form>

      {/* Documentos */}
      <section className="lb-card flex flex-col gap-3">
        <h2 className="text-h2 flex items-center gap-2 font-display uppercase tracking-wide text-info">
          <FileText size={16} /> Documentos
        </h2>
        {documents.length === 0 && <p className="text-body text-ink-faint">DNI, carnet de vacunas, ficha médica… todo en un solo lugar.</p>}
        <ul className="flex flex-col gap-2">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <a
                href={d.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 flex-1 items-center gap-2 text-item text-ink"
              >
                <Paperclip size={15} className="shrink-0 text-ink-ghost" />
                <span className="min-w-0 flex-1 truncate">{d.title}</span>
                <span className="text-meta text-ink-faint">
                  {DOC_KINDS[d.kind]} · {formatDay(d.created_at.slice(0, 10), "d MMM yy")}
                </span>
              </a>
              <button
                type="button"
                aria-label="Borrar documento"
                onClick={async () => {
                  if (!confirm(`¿Borramos "${d.title}"? No se puede deshacer.`)) return;
                  await deleteDocument(d.id);
                  router.refresh();
                }}
                className="flex h-11 w-9 items-center justify-center text-ink-ghost hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={docKind} onChange={(e) => setDocKind(e.target.value as DocumentKind)}>
              {(Object.keys(DOC_KINDS) as DocumentKind[]).map((k) => (
                <option key={k} value={k}>
                  {DOC_KINDS[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre (opcional)">
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder={DOC_KINDS[docKind]} />
          </Field>
        </div>
        <input
          ref={docInput}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => e.target.files?.[0] && onDoc(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => docInput.current?.click()}
          disabled={uploadingDoc}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-line text-sm font-semibold text-ink-faint disabled:opacity-60"
        >
          <Upload size={16} /> {uploadingDoc ? "Subiendo…" : "Subir foto o PDF"}
        </button>
      </section>
    </div>
  );
}
