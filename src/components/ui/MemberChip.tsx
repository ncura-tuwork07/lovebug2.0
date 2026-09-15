import type { Member } from "@/lib/types";

export function memberById(members: Member[], id: string | null | undefined): Member | null {
  if (!id) return null;
  return members.find((m) => m.id === id) ?? null;
}

export function MemberChip({ member, fallback = "Los dos" }: { member: Member | null; fallback?: string }) {
  const color = member?.color ?? "var(--color-familia)";
  const name = member?.name ?? fallback;
  return (
    <span
      className="lb-chip inline-flex h-6 shrink-0 items-center px-2 text-[11px] text-white"
      style={{ backgroundColor: color }}
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
      className="flex shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white"
      style={{ backgroundColor: member?.color ?? "var(--color-familia)", width: size, height: size }}
    >
      {ini}
    </span>
  );
}
