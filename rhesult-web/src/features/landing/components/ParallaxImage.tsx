"use client";

import { useEffect, useRef, memo } from "react";
import Image from "next/image";

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  speed: number;
  offset?: number;
  width?: number;
  height?: number;
}

/**
 * Image with GPU-accelerated parallax using requestAnimationFrame.
 * Uses next/image for automatic optimisation (WebP/AVIF, lazy load, srcset).
 */
export const ParallaxImage = memo(function ParallaxImage({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  speed,
  offset = 0,
  width = 1000,
  height = 667,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        el.style.transform = `translateY(${(window.scrollY - offset) * speed}px)`;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed, offset]);

  return (
    <div
      ref={ref}
      className={`relative will-change-transform ${wrapperClassName}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  );
});
