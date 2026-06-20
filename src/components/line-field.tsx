"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Flowing-grain field — the whole canvas combed into long, evenly-spaced
 * parallel filaments that warp coherently through a slow noise field, like
 * wood grain, brushed metal, or fingerprint ridges. The lines stay parallel
 * (no fanning, no bunching) and cover the entire page; the field drifts over
 * minutes so the grain slowly flows. A single rare copper ridge is the only
 * colour. The cursor presses a soft swell into the grain so ridges bend
 * gently around it.
 *
 * Theme-aware, tab-paused, reduced-motion safe. Pure 2D canvas.
 */

// ──────── Perlin (compact, deterministic) ────────
const perm = new Uint8Array(512);
(() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = 2027;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
const fadeC = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + t * (b - a);
const grad2 = (h: number, x: number, y: number) => {
  switch (h & 3) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    default: return -x - y;
  }
};
function perlin2(x: number, y: number) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fadeC(xf);
  const v = fadeC(yf);
  const aa = perm[perm[X] + Y];
  const ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y];
  const bb = perm[perm[X + 1] + Y + 1];
  const x1 = lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u);
  const x2 = lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
}

// ──────── Palette ────────
type RGB = readonly [number, number, number];
interface Palette {
  ink: RGB;
  accent: RGB;
  lineAlpha: number;
  accentAlpha: number;
}
const LIGHT: Palette = {
  ink: [40, 36, 32],
  accent: [190, 95, 30],
  lineAlpha: 0.20,
  accentAlpha: 0.55,
};
const DARK: Palette = {
  ink: [240, 237, 232],
  accent: [224, 158, 86],
  lineAlpha: 0.14,
  accentAlpha: 0.55,
};

const SPACING = 15;     // px between ridges at rest (dense full-page coverage)

export function LineField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let palette: Palette = LIGHT;
    let accentRow = 0;
    const t0 = performance.now();

    const readPalette = () => {
      palette = document.documentElement.classList.contains("dark")
        ? DARK
        : LIGHT;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rows = Math.ceil(h / SPACING) + 2;
      accentRow = Math.floor(rows * (0.35 + Math.random() * 0.3));
    };

    // ── Cursor: smoothed swell that bends nearby ridges ──
    const target = { x: -9999, y: -9999, on: 0 };
    const cur = { x: -9999, y: -9999, on: 0 };
    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      target.on = 1;
    };
    const onLeave = () => {
      target.on = 0;
    };

    // ── tuning ──
    const FX = 0.0017;     // horizontal field frequency
    const FY = 0.0042;     // vertical field frequency (cross-row variation)
    const SPEED = 0.035;   // field drift speed
    const AMP = SPACING * 2.7; // warp amplitude — weave without losing the grain

    const warp = (x: number, baseY: number, tSec: number) => {
      // Two octaves of shared noise → organic, coherent flow across all rows.
      const n =
        perlin2(x * FX, baseY * FY + tSec * SPEED) +
        0.45 *
          perlin2(
            x * FX * 2.4 + 31,
            baseY * FY * 2.4 - tSec * SPEED * 1.3,
          );
      return n * AMP;
    };

    const draw = (tSec: number) => {
      ctx.clearRect(0, 0, w, h);

      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      cur.on += (target.on - cur.on) * 0.05;

      const stepX = Math.max(5, Math.floor(w / 220));
      const rows = Math.ceil(h / SPACING) + 2;
      const cSigma = 200;
      const cSigma2 = cSigma * cSigma;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Start slightly above the top so warped ridges still cover the edge.
      for (let r = 0; r < rows; r++) {
        const baseY = r * SPACING - SPACING;
        const path = new Path2D();

        for (let px = 0; px <= w; px += stepX) {
          let y = baseY + warp(px, baseY, tSec);

          if (cur.on > 0.01) {
            const dx = px - cur.x;
            const dyc = y - cur.y;
            const d2 = dx * dx + dyc * dyc;
            if (d2 < cSigma2 * 4) {
              // Push ridges away from the cursor along the vertical.
              const f = Math.exp(-d2 / (2 * cSigma2)) * cur.on;
              y += Math.sign(dyc || 1) * f * 26;
            }
          }

          if (px === 0) path.moveTo(px, y);
          else path.lineTo(px, y);
        }

        const isAccent = r === accentRow;
        const colour = isAccent ? palette.accent : palette.ink;
        const alpha = isAccent ? palette.accentAlpha : palette.lineAlpha;
        ctx.strokeStyle = `rgba(${colour[0]},${colour[1]},${colour[2]},${alpha})`;
        ctx.lineWidth = isAccent ? 1.0 : 0.7;
        ctx.stroke(path);
      }
    };

    const loop = () => {
      draw((performance.now() - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };

    readPalette();
    resize();
    if (reduce) draw(0);
    else {
      raf = requestAnimationFrame(loop);
      window.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("mouseleave", onLeave);
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };
    const onResize = () => {
      resize();
      if (reduce) draw(0);
    };
    const observer = new MutationObserver(readPalette);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={cn("h-full w-full", className)} />;
}
