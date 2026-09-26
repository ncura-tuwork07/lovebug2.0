import type { Member } from "@/lib/types";

// Letra blanca o tinta según el color de la persona, la que se lea mejor (en ámbar o verde claro
// el blanco casi no se ve). A igualdad, preferimos blanco.
export function textOn(hex: string | null | undefined): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return "#FFFFFF";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const white = 1.05 / (L + 0.05);
  const ink = (L + 0.05) / 0.0718;
  return white >= ink * 0.9 ? "#FFFFFF" : "#1E293B";
}

export function memberById(members: Member[], id: string | null | undefined): Member | null {
  if (!id) return null;
  return members.find((m) => m.id === id) ?? null;
}

export function MemberChip({ member, fallback = "Los dos" }: { member: Member | null; fallback?: string }) {
  const color = member?.color ?? "var(--color-familia)";
  const name = member?.name ?? fallback;
  return (
    <span
      className="lb-chip inline-flex h-6 shrink-0 items-center px-2 text-[11px]"
      style={{ backgroundColor: color, color: textOn(member?.color ?? "#FF5A5F") }}
    >
      {name}
    </span>
  );
}

export function MemberDot({ member, size = 10 }: { member: Member | null; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ backgroundColor: member?.color ?? "var(--color-familia)", width: size, height: size }}
    />
  );
}

export function MemberAvatar({ member, size = 34 }: { member: Member | null; size?: number }) {
  const ini = member ? member.name.slice(0, 1).toUpperCase() : "♥";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold"
      style={{ backgroundColor: member?.color ?? "var(--color-familia)", color: textOn(member?.color ?? "#FF5A5F"), width: size, height: size }}
    >
      {ini}
    </span>
  );
}
