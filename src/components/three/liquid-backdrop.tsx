"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LiquidHeroScene = dynamic(
  () => import("./liquid-hero").then((m) => m.LiquidHeroScene),
  { ssr: false },
);

/**
 * Site-wide liquid ripple layer — a fixed, pointer-transparent WebGL overlay
 * that sits just above the silk mesh-gradient backdrop and below all content,
 * so the whole page reads as a water surface without ever distorting the DOM.
 * Mounts only after first paint and never on reduced-motion or no-WebGL
 * setups. Hidden tabs pause automatically via requestAnimationFrame
 * throttling, so no explicit frameloop gating is needed.
 */
export function LiquidBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    if (reduce || !webgl) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) return null;
  return <LiquidHeroScene />;
}

export default LiquidBackdrop;
