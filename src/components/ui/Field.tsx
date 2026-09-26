"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { Member } from "@/lib/types";

// `group`: para controles hechos de botones (BoolToggle). Dentro de un <label>, tocar el título o
// la ayuda "clickea" el primer botón y cambia la opción sin querer.
export function Field({ label, children, hint, group = false }: { label: string; children: ReactNode; hint?: string; group?: boolean }) {
  const content = (
    <>
      <span className="text-label font-bold uppercase tracking-wider text-ink-ghost">{label}</span>
      {children}
      {hint && <span className="text-meta text-ink-faint">{hint}</span>}
    </>
  );
  if (group) {
    return (
      <div role="group" aria-label={label} className="flex flex-col gap-1.5">
        {content}
      </div>
    );
  }
  return <label className="flex flex-col gap-1.5">{content}</label>;
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
// Con `value` + `onChange` se controla de afuera (ej. se prende solo al cargar un cumple de menor).
export function BoolToggle({
  name,
  defaultValue = false,
  value: controlled,
  onChange,
  falseLabel,
  trueLabel,
}: {
  name: string;
  defaultValue?: boolean;
  value?: boolean;
  onChange?: (value: boolean) => void;
  falseLabel: string;
  trueLabel: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
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
          onClick={() => {
            setOwn(opt.checked);
            onChange?.(opt.checked);
          }}
          className={`flex-1 text-sm font-semibold transition-colors ${value === opt.checked ? "bg-coral text-white" : "text-ink-soft"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const OTHER = "__otro__";

// Rol o relación: un desplegable de verdad (el <datalist> en Android casi no se ve y parece texto
// libre) con "Otro" para escribir lo que no esté en la lista. Manda el valor por un input oculto.
export function RolePicker({
  name,
  options,
  defaultValue = "",
  onChange,
  placeholder = "Elegí…",
  required = false,
  ariaLabel,
}: {
  name?: string;
  options: readonly string[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  ariaLabel?: string; // solo si no está dentro de un <Field> (que ya le da nombre)
}) {
  const known = options.includes(defaultValue);
  const [choice, setChoice] = useState(defaultValue ? (known ? defaultValue : OTHER) : "");
  const [custom, setCustom] = useState(defaultValue && !known ? defaultValue : "");
  const value = choice === OTHER ? custom.trim() : choice;
  return (
    <div className="flex flex-col gap-2">
      {name && <input type="hidden" name={name} value={value} />}
      <Select
        value={choice}
        required={required}
        aria-label={ariaLabel}
        onChange={(e) => {
          setChoice(e.target.value);
          onChange?.(e.target.value === OTHER ? custom.trim() : e.target.value);
        }}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OTHER}>Otro (lo escribo)</option>
      </Select>
      {choice === OTHER && (
        <Input
          value={custom}
          required={required}
          autoFocus={!custom}
          maxLength={30}
          placeholder="Escribilo acá"
          onChange={(e) => {
            setCustom(e.target.value);
            onChange?.(e.target.value.trim());
          }}
        />
      )}
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
