"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SolarisMark } from "@/components/logo";

const DiamondScene = dynamic(
  () => import("./diamond").then((m) => m.DiamondScene),
  { ssr: false },
);

/**
 * Client wrapper for the 3D scene. Only mounts the WebGL canvas after first
 * paint (and never when reduced motion / no WebGL), falling back to an elegant
 * static mark so the hero is always fast and accessible. Monochrome — the line
 * colour follows the active theme.
 */
export function DiamondHero() {
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let webglOk = false;
    try {
      const canvas = document.createElement("canvas");
      webglOk = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglOk = false;
    }
    setReduced(mq.matches || !webglOk);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const color = resolvedTheme === "dark" ? "#fafafa" : "#161618";

  if (reduced || !ready) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="absolute size-72 rounded-full bg-[radial-gradient(circle,oklch(0.5_0_0/0.1),transparent_68%)] blur-2xl" />
        <div
          className="absolute size-80 rounded-full border border-border"
          style={{ animation: "spin 26s linear infinite" }}
        >
          <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-foreground" />
          <span className="absolute top-1/2 -right-1 size-1.5 -translate-y-1/2 rounded-full bg-foreground/40" />
        </div>
        <div className="animate-float">
          <SolarisMark className="size-40 drop-shadow-[0_20px_50px_oklch(0_0_0_/_0.2)]" />
        </div>
      </div>
    );
  }

  return <DiamondScene color={color} />;
}
