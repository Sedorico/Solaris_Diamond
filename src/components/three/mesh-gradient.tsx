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
const LIGHT_COLORS = ["#ffffff", "#fbf4e8", "#ecd9b6", "#d2b074", "#b3914f"];
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

  const colors = dark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Base silk drape — large, slow folds */}
      <MeshGradient
        colors={colors}
        distortion={1.0}
        swirl={0.88}
        grainMixer={0.04}
        grainOverlay={0.0}
        speed={0.24}
        scale={1.5}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {/* Second layer — a true mirror of the base silk: identical colours and
          distortion/swirl/scale, but reverse speed so it counter-flows. At 0.5
          opacity it blends 50/50 with the base so both flows read equally
          (the reciprocal reads as a mirror instead of replacing the base). */}
      <MeshGradient
        colors={colors}
        distortion={1.0}
        swirl={0.88}
        grainMixer={0.0}
        grainOverlay={0.0}
        speed={-0.24}
        scale={1.5}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

export default MeshGradientScene;
