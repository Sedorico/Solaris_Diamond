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
// weighted (repeated) so white/black dominates, with a smooth champagne→gold
// ramp so the gold melts in instead of jumping (the "fake gradient" look).
const LIGHT_COLORS = ["#ffffff", "#ffffff", "#f3ead8", "#dcbf85", "#c2912e"];
const DARK_COLORS = ["#000000", "#000000", "#171009", "#3a2a12", "#caa03c"];

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
      distortion={0.9}
      swirl={0.65}
      grainMixer={0.18}
      grainOverlay={0.04}
      speed={0.28}
      scale={1.3}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default MeshGradientScene;
