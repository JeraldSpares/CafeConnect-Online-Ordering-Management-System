"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Wraps next/image and applies a subtle translate+scale based on the
 * element's position in the viewport. Use it as a *child* of a sized,
 * positioned container — e.g.
 *
 *   <div className="relative h-[480px] overflow-hidden">
 *     <ParallaxImage src="..." alt="..." fill sizes="..." />
 *   </div>
 */
export function ParallaxImage({
  intensity = 0.18,
  className = "",
  style,
  ...imgProps
}: Omit<ImageProps, "ref"> & {
  intensity?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = wrap.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const fromMid = center - window.innerHeight / 2;
      setOffset(fromMid * intensity * -1);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [intensity]);

  return (
    <div
      ref={wrap}
      className={`relative h-full w-full overflow-hidden ${className}`}
    >
      <Image
        {...imgProps}
        alt={imgProps.alt}
        style={{
          ...style,
          objectFit: "cover",
          transform: `translateY(${offset}px) scale(1.08)`,
          transition: "transform 80ms linear",
          willChange: "transform",
        }}
      />
    </div>
  );
}
