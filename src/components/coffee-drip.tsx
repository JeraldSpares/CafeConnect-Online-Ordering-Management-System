"use client";

import { useEffect, useState } from "react";

/**
 * A page-wide ambient effect tied to scroll position.
 * - A coffee-cup ornament fixed on the right side that "fills" as you scroll
 * - Streaming drip below it
 * - Floating beans that drift across the viewport, rotated by scrollY
 *
 * Rendered client-only after mount to avoid hydration mismatch from
 * viewport-dependent transforms.
 */
export function CoffeeDrip() {
  const [mounted, setMounted] = useState(false);
  const [pct, setPct] = useState(0);
  const [y, setY] = useState(0);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setY(h.scrollTop);
      setPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {/* Floating beans — drift across as user scrolls */}
      <Bean top="10%" left={-40} drift={300} y={y} speed={0.25} delay={0} />
      <Bean top="32%" left={-60} drift={420} y={y} speed={0.35} delay={1.2} flip />
      <Bean top="58%" left={-30} drift={260} y={y} speed={0.45} delay={2.4} />
      <Bean top="78%" left={-50} drift={360} y={y} speed={0.3} delay={3.6} flip />

      {/* Side cup with fill */}
      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 sm:block">
        <svg width="46" height="64" viewBox="0 0 46 64" aria-hidden>
          {/* Cup outline */}
          <path
            d="M6 12 H34 V50 Q34 58 26 58 H14 Q6 58 6 50 Z"
            fill="rgba(255,255,255,0.55)"
            stroke="var(--color-primary)"
            strokeWidth="2"
          />
          {/* Handle */}
          <path
            d="M34 22 Q44 24 44 32 Q44 40 34 42"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
          />
          {/* Coffee fill (clipped) */}
          <clipPath id="cupClip">
            <path d="M8 14 H32 V48 Q32 56 26 56 H14 Q8 56 8 48 Z" />
          </clipPath>
          <g clipPath="url(#cupClip)">
            <rect
              x="6"
              y={56 - (pct / 100) * 42}
              width="34"
              height={56}
              fill="url(#coffeeGrad)"
              style={{ transition: "y 200ms linear" }}
            />
          </g>
          <defs>
            <linearGradient id="coffeeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a2718" />
              <stop offset="1" stopColor="#1e3932" />
            </linearGradient>
          </defs>
          {/* Drip (only visible after first scroll) */}
          <circle
            cx="20"
            cy="58"
            r="2"
            fill="var(--color-primary)"
            style={{
              opacity: pct > 1 ? 1 : 0,
              transition: "opacity 200ms ease",
            }}
          >
            <animate
              attributeName="cy"
              from="58"
              to="64"
              dur="1.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="1.4s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
        <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-widest text-[var(--color-primary)]/60">
          {Math.round(pct)}%
        </p>
      </div>
    </div>
  );
}

function Bean({
  top,
  left,
  drift,
  y,
  speed,
  delay,
  flip,
}: {
  top: string;
  left: number;
  drift: number;
  y: number;
  speed: number;
  delay: number;
  flip?: boolean;
}) {
  // Reset cycle every ~2000 px scrolled
  const cycle = 2000;
  const local = ((y * speed + delay * 200) % cycle) / cycle; // 0..1
  const viewportW =
    typeof window !== "undefined" ? window.innerWidth : 1280;
  const x = left + local * (viewportW + drift);
  const rot = local * 720 * (flip ? -1 : 1);

  return (
    <span
      aria-hidden
      className="absolute select-none text-[var(--color-primary)]/8"
      style={{
        top,
        left: 0,
        transform: `translate3d(${x}px, 0, 0) rotate(${rot}deg)`,
        transition: "transform 100ms linear",
        opacity: 0.08,
        fontSize: "28px",
      }}
    >
      <i className="fa-solid fa-coffee" />
    </span>
  );
}
