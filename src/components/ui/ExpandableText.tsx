"use client";

import { useState } from "react";

export function ExpandableText({
  text,
  limit = 280,
  className = "",
}: {
  text: string;
  limit?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit;
  const shown = open || !long ? text : text.slice(0, limit).trimEnd() + "…";

  return (
    <div className={className}>
      <p className="whitespace-pre-line">{shown}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 min-h-9 text-sm font-semibold text-coral"
        >
          {open ? "Ver menos" : "Leer completo"}
        </button>
      )}
    </div>
  );
}
