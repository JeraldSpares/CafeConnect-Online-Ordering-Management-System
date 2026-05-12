import Image from "next/image";

/**
 * <BrandLogo />
 *
 * Renders the Hebrews Kape logo with no container or background.
 * Uses a transparent PNG (`/logo.png`) so it composites cleanly onto
 * any surface — cream pages, white cards, the dark CTA panel, etc.
 */
export function BrandLogo({
  size = 48,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Hebrews Kape"
    >
      <Image
        src="/logo.png"
        alt="Hebrews Kape"
        fill
        sizes={`${size}px`}
        fetchPriority={priority ? "high" : "auto"}
        className="object-contain"
      />
    </span>
  );
}
