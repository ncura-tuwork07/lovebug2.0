export const PEOPLE = {
  naza: { name: "Naza", ini: "N", hex: "var(--color-naza)" },
  jaz: { name: "Jazmín", ini: "J", hex: "var(--color-jaz)" },
  juana: { name: "Juana", ini: "JU", hex: "var(--color-juana)" },
  salvador: { name: "Salvador", ini: "S", hex: "var(--color-salvador)" },
  ariana: { name: "Ariana", ini: "A", hex: "var(--color-ariana)" },
  familia: { name: "Los dos", ini: "♥", hex: "var(--color-familia)" },
} as const;

export type PersonKey = keyof typeof PEOPLE;

export function PersonChip({ person, size = "sm" }: { person: PersonKey; size?: "sm" | "md" }) {
  const p = PEOPLE[person];
  const dims = size === "sm" ? "h-6 px-2 text-[11px]" : "h-8 px-3 text-xs";

  return (
    <span
      className={`lb-chip inline-flex items-center gap-1 text-white ${dims}`}
      style={{ backgroundColor: p.hex }}
    >
      {p.name}
    </span>
  );
}

export function PersonAvatar({ person, size = 34 }: { person: PersonKey; size?: number }) {
  const p = PEOPLE[person];

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white"
      style={{ backgroundColor: p.hex, width: size, height: size }}
    >
      {p.ini}
    </span>
  );
}
