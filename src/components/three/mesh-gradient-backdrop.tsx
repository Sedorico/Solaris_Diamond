"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MeshGradientScene = dynamic(
  () => import("./mesh-gradient").then((m) => m.MeshGradientScene),
  { ssr: false },
);

/**
 * Mounts the mesh-gradient scene only after first paint, and never on
 * reduced-motion or no-WebGL setups — so the page stays fast and accessible.
 * Falls back to a flat brand-coloured wash (the CSS background) when the
 * canvas is suppressed.
 */
export function MeshGradientBackdrop() {
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
  return <MeshGradientScene />;
}

export default MeshGradientBackdrop;
