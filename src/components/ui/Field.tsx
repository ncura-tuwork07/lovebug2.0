"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { Member } from "@/lib/types";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label font-bold uppercase tracking-wider text-ink-ghost">{label}</span>
      {children}
      {hint && <span className="text-meta text-ink-faint">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`lb-input ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className={`lb-input resize-none ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`lb-input appearance-none ${props.className ?? ""}`} />;
}

export function MemberSelect({
  members,
  allowNone = true,
  noneLabel = "Los dos / familia",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { members: Member[]; allowNone?: boolean; noneLabel?: string }) {
  return (
    <Select {...props}>
      {allowNone && <option value="">{noneLabel}</option>}
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </Select>
  );
}

// Elegir entre dos opciones con un toque (nada de tipear ni de un checkbox que se puede pasar por
// alto): manda el valor por un input oculto, así los forms que usan fd().bool(name) no cambian.
export function BoolToggle({
  name,
  defaultValue = false,
  falseLabel,
  trueLabel,
}: {
  name: string;
  defaultValue?: boolean;
  falseLabel: string;
  trueLabel: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex h-11 overflow-hidden rounded-md border-[1.5px] border-line">
      <input type="hidden" name={name} value={value ? "on" : ""} />
      {[
        { label: falseLabel, checked: false },
        { label: trueLabel, checked: true },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          aria-pressed={value === opt.checked}
          onClick={() => setValue(opt.checked)}
          className={`flex-1 text-sm font-semibold transition-colors ${value === opt.checked ? "bg-coral text-white" : "text-ink-soft"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SubmitRow({
  saving,
  onDelete,
  submitLabel = "Guardar",
}: {
  saving: boolean;
  onDelete?: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="min-h-11 rounded-md px-4 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          Borrar
        </button>
      )}
      <button type="submit" disabled={saving} className="lb-btn ml-auto min-h-11 disabled:opacity-60">
        {saving ? "Guardando…" : submitLabel}
      </button>
    </div>
  );
}
