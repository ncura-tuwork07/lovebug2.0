export function Logo({
  size = 32,
  variant = "auto",
  className,
}: {
  size?: number;
  // "auto" sigue el tema (claro/nocturno); "dark" es la versión fija para fondos oscuros (login).
  variant?: "auto" | "dark";
  className?: string;
}) {
  const body = variant === "dark" ? "#0F172A" : "var(--color-logo-body)";
  const antenna = variant === "dark" ? "#F8FAFC" : "var(--color-logo-antenna)";

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
      <path d="M32 18c2-4 6-6 11-6 8 0 15 6 15 16 0 13-14 22-26 30z" fill="#F0454B" />
      <rect x="30.4" y="16" width="3.2" height="40" rx="1.6" fill={body} />
      <circle cx="32" cy="15" r="9" fill={body} />
      <path d="M25 6l3 5M39 6l-3 5" stroke={antenna} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="25" cy="4.5" r="2.6" fill={antenna} />
      <circle cx="39" cy="4.5" r="2.6" fill={antenna} />
      <circle cx="21" cy="28" r="4" fill={body} />
      <circle cx="43" cy="28" r="4" fill={body} />
      <circle cx="26" cy="40" r="3.2" fill={body} />
      <circle cx="38" cy="40" r="3.2" fill={body} />
    </svg>
  );
}
