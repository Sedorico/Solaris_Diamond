"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Flowing mesh-gradient backdrop — large, smooth colour spots drifting along
 * organic trajectories (the @paper-design "MeshGradient" shader). Black-and-
 * gold silk by design: in light mode the field plays from white through warm
 * cream into champagne and gold; in dark mode it inverts to black and deep
 * charcoal threaded with the same gold. Slow speed + high distortion and swirl
 * give the liquid-silk motion; a whisper of grain keeps it from banding.
 */

// White × gold silk (light) / black × gold silk (dark). The base colour is
// weighted (repeated) so white/black dominates and gold stays a rare accent.
const LIGHT_COLORS = ["#ffffff", "#ffffff", "#f5efe2", "#e6d4ac", "#c89c38"];
const DARK_COLORS = ["#000000", "#000000", "#0f0c08", "#241b0f", "#cda23f"];

export function MeshGradientScene() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const read = () =>
      setDark(document.documentElement.classList.contains("dark"));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => mo.disconnect();
  }, []);

  return (
    <MeshGradient
      colors={dark ? DARK_COLORS : LIGHT_COLORS}
      distortion={0.85}
      swirl={0.6}
      speed={0.3}
      scale={1.25}
      grainOverlay={0.04}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default MeshGradientScene;
