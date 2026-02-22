"use client";

import { useEffect, useRef, memo } from "react";

interface ParallaxBlobProps {
  className: string;
  speed: number;
  style?: React.CSSProperties;
}

/**
 * GPU-accelerated parallax blob using requestAnimationFrame + direct DOM transform.
 * Does NOT trigger React re-renders on scroll.
 */
export const ParallaxBlob = memo(function ParallaxBlob({ className, speed, style }: ParallaxBlobProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        el.style.transform = `translateY(${window.scrollY * speed}px)`;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  return <div ref={ref} className={className} style={{ willChange: "transform", ...style }} />;
});
