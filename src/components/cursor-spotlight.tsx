"use client";

import { useRef, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lusion.co-style cursor spotlight — a premium hover glow that follows the
 * cursor across a card. Two layers do the work:
 *
 *  1. **Surface bloom**: a wide, soft radial gradient that brushes the card
 *     interior with a barely-there warm glow.
 *  2. **Border highlight**: a tightly-clipped radial gradient that lights up
 *     just the 1px border ring around the card, where the cursor is nearby.
 *
 * Cursor position is written to `--mx` / `--my` CSS variables on mousemove —
 * cheap and GPU-accelerated, no rAF needed. Fades smoothly on leave.
 */
export function CursorSpotlight({
  children,
  className,
  borderColor = "rgba(201, 138, 60, 0.55)", // brand gold
  bloomColor = "rgba(255, 200, 130, 0.16)", // soft warm bloom
  borderRadius = 380,
  bloomRadius = 560,
}: {
  children: ReactNode;
  className?: string;
  borderColor?: string;
  bloomColor?: string;
  borderRadius?: number;
  bloomRadius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--spotlight-opacity", "1");
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--spotlight-opacity", "0");
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn("relative", className)}
      style={
        {
          "--mx": "50%",
          "--my": "50%",
          "--spotlight-opacity": "0",
        } as React.CSSProperties
      }
    >
      {/* Surface bloom — soft inner warmth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] transition-opacity duration-500"
        style={{
          opacity: "var(--spotlight-opacity)",
          background: `radial-gradient(${bloomRadius}px circle at var(--mx) var(--my), ${bloomColor}, transparent 70%)`,
        }}
      />

      {/* Border highlight — tightly clipped to the card edge via mask-composite */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-500"
        style={{
          opacity: "var(--spotlight-opacity)",
          padding: "1px",
          background: `radial-gradient(${borderRadius}px circle at var(--mx) var(--my), ${borderColor}, transparent 65%)`,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          maskComposite: "exclude",
        }}
      />

      {/* Content sits above the glows */}
      <div className="relative">{children}</div>
    </div>
  );
}
