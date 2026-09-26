"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, RotateCw } from "lucide-react";

// Hasta que se crean las tablas del plano: tres toques desde el celu (copiar, abrir Supabase, pegar
// y Run) y recargar. Solo lo ven los admins; el resto ve "casi listo".
export function HomeSetup({ sql, editorUrl }: { sql: string; editorUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
    } catch {
      setShowSql(true); // sin permiso de portapapeles: lo mostramos para copiarlo a mano
    }
  }

  return (
    <section className="lb-card flex flex-col gap-3">
      <p className="text-item font-medium text-ink">El plano de la casa está casi listo 🏡</p>
      <p className="text-meta text-ink-faint">Falta crear sus tablas en Supabase. Es una sola vez y tarda un minuto:</p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-soft">
        <li>Tocá “Copiar el SQL”.</li>
        <li>Tocá “Abrir Supabase”: se abre el SQL Editor de tu proyecto.</li>
        <li>Pegá, tocá “Run” y esperá el “Success”.</li>
        <li>Volvé acá y tocá “Ya lo corrí”.</li>
      </ol>
      <button type="button" onClick={copy} className="lb-btn flex min-h-11 items-center justify-center gap-2">
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "¡Copiado!" : "Copiar el SQL"}
      </button>
      {editorUrl && (
        <a
          href={editorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border-[1.5px] border-line text-sm font-semibold text-ink-soft"
        >
          <ExternalLink size={16} /> Abrir Supabase
        </a>
      )}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold text-coral"
      >
        <RotateCw size={16} /> Ya lo corrí
      </button>
      <button type="button" onClick={() => setShowSql((v) => !v)} className="min-h-9 text-meta font-semibold text-ink-faint">
        {showSql ? "Ocultar el SQL" : "Ver el SQL"}
      </button>
      {showSql && <textarea readOnly value={sql} rows={10} onFocus={(e) => e.currentTarget.select()} className="lb-input font-mono text-[11px]" />}
    </section>
  );
}
