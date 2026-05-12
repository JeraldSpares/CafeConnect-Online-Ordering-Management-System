import Image from "next/image";

type Shape = "circle" | "rounded";

export function BrandLogo({
  size = 40,
  shape = "circle",
  glow = false,
  ring = true,
  className = "",
  priority = false,
}: {
  size?: number;
  shape?: Shape;
  glow?: boolean;
  ring?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${radius} ${
        ring ? "ring-2 ring-[var(--color-accent)]/45" : ""
      } ${glow ? "shadow-[0_0_28px_rgba(199,152,98,0.55)]" : "shadow-sm"} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src="/logo.jpg"
        alt="Hebrews Kape"
        fill
        sizes={`${size}px`}
        fetchPriority={priority ? "high" : "auto"}
        className="object-cover scale-[1.05]"
      />
    </span>
  );
}

/**
 * Logo + wordmark side-by-side. Use in headers/footers.
 */
export function BrandLockup({
  size = 40,
  className = "",
  variant = "default",
  priority = false,
}: {
  size?: number;
  className?: string;
  variant?: "default" | "stacked";
  priority?: boolean;
}) {
  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-center gap-1 ${className}`}>
        <BrandLogo size={size} glow priority={priority} />
        <span className="font-display text-base font-bold tracking-tight text-[var(--color-primary)]">
          Hebrews Kape
        </span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandLogo size={size} priority={priority} />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-accent)]">
          Hebrews Kape
        </span>
        <span className="font-display text-base font-bold tracking-tight text-[var(--color-primary)]">
          CafeConnect
        </span>
      </span>
    </span>
  );
}
