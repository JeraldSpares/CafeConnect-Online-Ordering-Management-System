import Image from "next/image";

/**
 * <BrandLogo />
 *
 * Renders the Hebrews Kape logo with NO visible white background.
 *
 * On light/cream backgrounds (default) the JPG's white pixels are knocked
 * out via `mix-blend-mode: multiply`, leaving only the black circle, the
 * "HEBREWS KAPE" wordmark, and the brown + green beans visible. The mark
 * sits directly on the page without any container.
 *
 * On dark backgrounds the multiply trick can't preserve the black ink, so
 * pass `onDark` and the logo is rendered inside a tiny soft "stamp" badge
 * that keeps the mark legible without looking like a generic avatar.
 */
export function BrandLogo({
  size = 48,
  className = "",
  onDark = false,
  priority = false,
}: {
  size?: number;
  className?: string;
  onDark?: boolean;
  priority?: boolean;
}) {
  if (onDark) {
    const pad = Math.round(size * 0.08);
    return (
      <span
        className={`relative inline-block shrink-0 rounded-2xl bg-white/95 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] backdrop-blur ${className}`}
        style={{ width: size, height: size, padding: pad }}
        aria-label="Hebrews Kape"
      >
        <span className="relative block h-full w-full">
          <Image
            src="/logo.jpg"
            alt="Hebrews Kape"
            fill
            sizes={`${size}px`}
            fetchPriority={priority ? "high" : "auto"}
            className="object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Hebrews Kape"
    >
      <Image
        src="/logo.jpg"
        alt="Hebrews Kape"
        fill
        sizes={`${size}px`}
        fetchPriority={priority ? "high" : "auto"}
        className="object-contain"
        style={{ mixBlendMode: "multiply" }}
      />
    </span>
  );
}
