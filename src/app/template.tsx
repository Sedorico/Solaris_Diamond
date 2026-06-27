"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Site-wide page transition. `template.tsx` re-mounts on every navigation, so
 * each route fades in. Opacity-only on purpose — a transform/filter here would
 * become the containing block for the page's many `position: fixed` elements
 * (navbar, mesh backdrop, the CTA shader layers) and break them.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
