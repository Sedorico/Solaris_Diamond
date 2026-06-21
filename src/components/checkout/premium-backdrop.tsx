"use client";

import { useEffect, useRef } from "react";

/**
 * Flowing gold wave-lines — clusters ("bands") of fine parallel gold filaments
 * that undulate across the canvas like silk or Japanese line-art waves. Each
 * band follows a travelling wave and pinches into tight nodes / fans into airy
 * gaps, so the lines bunch and flow. Crisp lines (no motion blur), animated by
 * advancing the wave phase. Black + gold in dark mode (matches the reference),
 * cream + deep gold in light. Reduced-motion safe.
 */
export function PremiumBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let raf = 0;
    const t0 = performance.now();

    // Smoothed pointer — gently bends the nearest waves as the cursor moves.
    const target = { x: -9999, y: -9999, on: 0 };
    const cur = { x: -9999, y: -9999, on: 0 };

    const isDark = () => document.documentElement.classList.contains("dark");

    const TAU = Math.PI * 2;

    interface Band {
      centerN: number; // vertical center (0..1)
      amp: number; // primary wave amplitude (fraction of height)
      freqA: number;
      speedA: number;
      phaseA: number;
      freqB: number;
      speedB: number;
      phaseB: number;
      spreadN: number; // band half-thickness (fraction of height)
      pinchFreq: number;
      pinchSpeed: number;
      pinchPhase: number;
      lines: number;
      tilt: number; // diagonal lean
    }

    let bands: Band[] = [];
    const buildBands = () => {
      let s = 20260620 >>> 0;
      const rnd = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
      };
      const N = 4;
      bands = Array.from({ length: N }, (_, i) => ({
        centerN: 0.2 + (i / (N - 1)) * 0.6 + (rnd() - 0.5) * 0.07,
        amp: 0.1 + rnd() * 0.1,
        freqA: 1.3 + rnd() * 1.1,
        speedA: 0.04 + rnd() * 0.05,
        phaseA: rnd() * TAU,
        freqB: 2.4 + rnd() * 1.6,
        speedB: 0.03 + rnd() * 0.045,
        phaseB: rnd() * TAU,
        spreadN: 0.05 + rnd() * 0.06,
        pinchFreq: 0.9 + rnd() * 1.1,
        pinchSpeed: 0.05 + rnd() * 0.05,
        pinchPhase: rnd() * TAU,
        lines: 24 + Math.floor(rnd() * 14),
        tilt: (rnd() - 0.5) * 0.13,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const draw = () => {
      const t = reduce ? 0 : (performance.now() - t0) / 1000;
      const dark = isDark();

      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      cur.on += (target.on - cur.on) * 0.05;

      // Opaque background — crisp lines, no motion trails.
      ctx.fillStyle = dark ? "#0a0907" : "#faf8f4";
      ctx.fillRect(0, 0, width, height);

      const sx = Math.max(5, Math.floor(width / 220));
      const cursorSigma2 = 240 * 240;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const band of bands) {
        const cy0 = band.centerN * height;
        const amp = band.amp * height;
        const spread = band.spreadN * height;

        for (let k = 0; k < band.lines; k++) {
          const u = band.lines === 1 ? 0 : (k / (band.lines - 1)) * 2 - 1; // -1..1
          // A handful of brighter "highlight" strands give the band depth.
          const highlight = k % 6 === 0;

          ctx.beginPath();
          let started = false;

          for (let px = 0; px <= width; px += sx) {
            const xn = px / width;
            const wave =
              Math.sin(xn * band.freqA * TAU + t * band.speedA * TAU + band.phaseA) *
                amp +
              Math.sin(xn * band.freqB * TAU - t * band.speedB * TAU + band.phaseB) *
                amp *
                0.32;

            // Travelling pinch — band thins to nodes, fans between them.
            const pinch = Math.abs(
              Math.sin(
                xn * band.pinchFreq * TAU -
                  t * band.pinchSpeed * TAU +
                  band.pinchPhase,
              ),
            );
            const localSpread = spread * (0.1 + 0.9 * pinch);
            const eased = Math.sign(u) * Math.pow(Math.abs(u), 1.15);

            let y = cy0 + band.tilt * (px - width / 2) + wave + eased * localSpread;

            // Gentle cursor bend.
            if (cur.on > 0.01) {
              const dx = px - cur.x;
              const dy = y - cur.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < cursorSigma2 * 4) {
                const f = Math.exp(-d2 / (2 * cursorSigma2)) * cur.on;
                y += Math.sign(dy || 1) * f * 26;
              }
            }

            if (!started) {
              ctx.moveTo(px, y);
              started = true;
            } else {
              ctx.lineTo(px, y);
            }
          }

          // Soft fade toward the band edges; brighter highlight strands.
          const edge = 0.45 + 0.55 * (1 - Math.abs(u));
          const a = (dark ? 0.5 : 0.42) * edge * (highlight ? 1.7 : 1);
          if (dark) {
            ctx.strokeStyle = highlight
              ? `rgba(255, 224, 138, ${Math.min(1, a)})`
              : `rgba(228, 188, 86, ${a})`;
          } else {
            ctx.strokeStyle = highlight
              ? `rgba(201, 154, 60, ${Math.min(1, a)})`
              : `rgba(176, 128, 42, ${a})`;
          }
          ctx.lineWidth = highlight ? 1.15 : 0.85;
          ctx.stroke();
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      resize();
      if (reduce) draw();
    };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      target.on = 1;
    };
    const onLeave = () => {
      target.on = 0;
    };

    buildBands();
    resize();
    draw();

    window.addEventListener("resize", onResize);
    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-background"
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
