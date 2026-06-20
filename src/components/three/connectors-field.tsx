"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ConnectorsScene = dynamic(
  () => import("./connectors").then((m) => m.ConnectorsScene),
  { ssr: false },
);

/**
 * Mounts the connector field only after first paint, never on reduced-motion /
 * no-WebGL, and with fewer instances on small screens — so the CTA stays fast
 * everywhere. Falls back to nothing (the box's gradient shows through).
 */
export function ConnectorsField() {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(150);

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
    const small = window.innerWidth < 768;
    setCount(small ? 70 : 150);
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) return null;
  return <ConnectorsScene count={count} />;
}
