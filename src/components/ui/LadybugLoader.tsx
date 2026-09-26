import { Logo } from "@/components/Logo";

// La mariquita del logo volando en círculos + un texto: para que nunca parezca que la app se tildó.
export function LadybugLoader({
  label = "Cargando…",
  size = 28,
  variant = "auto",
  className = "",
}: {
  label?: string | null;
  size?: number;
  variant?: "auto" | "dark";
  className?: string;
}) {
  const orbit = Math.round(size * 2.4);
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative" style={{ width: orbit, height: orbit }}>
        <div className={`absolute inset-[18%] rounded-full border-2 border-dashed ${variant === "dark" ? "border-white/20" : "border-coral/25"}`} />
        <div className="lb-orbit absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <div className="lb-flutter">
              <Logo size={size} variant={variant} />
            </div>
          </div>
        </div>
      </div>
      {label && <p className={`font-display text-sm font-semibold ${variant === "dark" ? "text-white/80" : "text-ink-soft"}`}>{label}</p>}
    </div>
  );
}
