export function Logo({
  size = 32,
  variant = "light",
  className,
}: {
  size?: number;
  variant?: "light" | "dark";
  className?: string;
}) {
  const ink = variant === "dark" ? "#F8FAFC" : "#1E293B";
  const bodyLine = variant === "dark" ? "#0F172A" : "#1E293B";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Lovebug"
    >
      <path
        d="M32 58C20 50 6 41 6 28 6 18 13 12 21 12c5 0 9 2 11 6 2-4 6-6 11-6 8 0 15 6 15 16 0 13-14 22-26 30z"
        fill="#FF5A5F"
      />
      <path
        d="M32 18c2-4 6-6 11-6 8 0 15 6 15 16 0 13-14 22-26 30z"
        fill="#F0454B"
      />
      <rect x="30.4" y="16" width="3.2" height="40" rx="1.6" fill={bodyLine} />
      <circle cx="32" cy="15" r="9" fill={bodyLine} />
      <path d="M25 6l3 5M39 6l-3 5" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="25" cy="4.5" r="2.6" fill={ink} />
      <circle cx="39" cy="4.5" r="2.6" fill={ink} />
      <circle cx="21" cy="28" r="4" fill={bodyLine} />
      <circle cx="43" cy="28" r="4" fill={bodyLine} />
      <circle cx="26" cy="40" r="3.2" fill={bodyLine} />
      <circle cx="38" cy="40" r="3.2" fill={bodyLine} />
    </svg>
  );
}
