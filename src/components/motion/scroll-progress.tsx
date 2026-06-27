"use client";

import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "motion/react";

/**
 * Thin scroll-progress bar pinned to the top of the viewport, filling left→right
 * as the page scrolls. Scales only itself (scaleX), so it doesn't affect any
 * other fixed elements. Sits above the navbar (z-[60] > navbar z-50).
 */
export function ScrollProgress() {
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  // Public/marketing pages only — keep the dashboard and admin consoles clean.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-accent via-accent to-accent/30"
    />
  );
}
