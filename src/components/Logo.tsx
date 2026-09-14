export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lovebug-gradient" x1="8" y1="10" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB347" />
          <stop offset="1" stopColor="#FF5A5F" />
        </linearGradient>
      </defs>

      {/* Antenas */}
      <path
        d="M24 14 L18 6 M40 14 L46 6"
        stroke="var(--brand-ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="18" cy="6" r="2.4" fill="var(--brand-ink)" />
      <circle cx="46" cy="6" r="2.4" fill="var(--brand-ink)" />

      {/* Cuerpo con forma de corazón */}
      <path
        d="M32 56
           C 14 44, 4 33, 4 21
           C 4 11, 12 6, 20 10
           C 25 12.5, 29 17, 32 22
           C 35 17, 39 12.5, 44 10
           C 52 6, 60 11, 60 21
           C 60 33, 50 44, 32 56 Z"
        fill="url(#lovebug-gradient)"
      />

      {/* Línea central de las alas */}
      <path d="M32 22 L32 52" stroke="var(--brand-ink)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />

      {/* Manchas */}
      <circle cx="18" cy="26" r="3.4" fill="var(--brand-ink)" />
      <circle cx="16" cy="37" r="3" fill="var(--brand-ink)" />
      <circle cx="24" cy="44" r="2.6" fill="var(--brand-ink)" />
      <circle cx="46" cy="26" r="3.4" fill="var(--brand-ink)" />
      <circle cx="48" cy="37" r="3" fill="var(--brand-ink)" />
      <circle cx="40" cy="44" r="2.6" fill="var(--brand-ink)" />
    </svg>
  );
}
