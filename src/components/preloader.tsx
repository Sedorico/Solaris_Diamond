"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, animate, motion } from "motion/react";
import { usePreloader } from "@/lib/store/preloader";

const ease = [0.22, 1, 0.36, 1] as const;
const easeSplit = [0.76, 0, 0.24, 1] as const;

/** The signature gold of the Solaris sun (matches the logo mark). */
const SUN_GOLD = "#C98A3C";

/**
 * Brand preloader — a cinematic opening sequence, not a spinner.
 *
 * Act I    the sun mark draws itself: crescent first, then thirteen rays
 *          sweeping around the arc, then the serif "S" condenses in.
 * Act II   SOLARIS rises letter-by-letter from a baseline mask; hairlines pull
 *          out to "DIAMOND"; a gold light-band sweeps the whole lockup.
 * Counter  a giant editorial percentage (bottom-left) paces the whole thing.
 * Exit     the lockup lifts away, a gold seam flashes across the middle, and
 *          the screen splits in two — both halves glide apart to reveal the
 *          page like curtains.
 */
export function Preloader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reduce, setReduce] = useState(false);

  // Motion scale: reduced-motion visitors get the same reveal, ~3× faster.
  const k = reduce ? 0.3 : 1;

  useEffect(() => {
    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReduce(prefersReduce);
    // Lock scroll on <html>, NOT <body> — the concierge overlay locks body,
    // and sharing the same property caused a restore race (page unlocking
    // behind the open concierge, or staying locked after it closed).
    document.documentElement.style.overflow = "hidden";
    // Hold the hero's entrance until the curtains open (see usePreloader).
    usePreloader.getState().setRevealed(false);

    const controls = animate(0, 100, {
      duration: prefersReduce ? 0.7 : 2.15,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setProgress(Math.round(v)),
      onComplete: () => {
        // A beat at 100 so the finished lockup registers, then exit.
        window.setTimeout(() => setDone(true), prefersReduce ? 80 : 280);
      },
    });
    return () => {
      controls.stop();
      // Never leave the page stuck un-revealed or scroll-locked if we
      // unmount early.
      usePreloader.getState().setRevealed(true);
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (done) {
      // Curtains are opening — let the page start its entrance underneath.
      usePreloader.getState().setRevealed(true);
      const t = setTimeout(
        () => {
          document.documentElement.style.overflow = "";
        },
        reduce ? 500 : 1350,
      );
      return () => clearTimeout(t);
    }
  }, [done, reduce]);

  // Same ray geometry as the SolarisMark logo, rebuilt here so each ray can
  // draw on individually.
  const rays = useMemo(() => {
    const cx = 20;
    const cy = 15;
    return Array.from({ length: 13 }).map((_, i) => {
      const deg = 18 + i * 12;
      const a = (deg * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const ri = 7.5;
      const ro = 10.5 + 3 * s;
      return {
        x1: cx + ri * c,
        y1: cy - ri * s,
        x2: cx + ro * c,
        y2: cy - ro * s,
      };
    });
  }, []);

  const word = "SOLARIS".split("");

  return (
    <AnimatePresence>
      {!done && (
        <motion.div className="fixed inset-0 z-[120]" aria-hidden>
          {/* ── The two curtain halves (the backdrop while loading) ── */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 bg-background"
            exit={{ y: "-100%" }}
            transition={{
              duration: 0.85 * k,
              delay: 0.42 * k,
              ease: easeSplit,
            }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-background"
            exit={{ y: "100%" }}
            transition={{
              duration: 0.85 * k,
              delay: 0.42 * k,
              ease: easeSplit,
            }}
          />

          {/* ── Gold seam — flashes across the middle just before the split ── */}
          <motion.div
            className="absolute left-0 right-0 top-1/2 h-px origin-center"
            style={{ backgroundColor: SUN_GOLD }}
            initial={{ scaleX: 0, opacity: 0 }}
            exit={{
              scaleX: [0, 1, 1],
              opacity: [1, 1, 0],
              transition: { duration: 1.05 * k, times: [0, 0.35, 1], ease },
            }}
          />

          {/* ── Everything visible during load lifts away first on exit ── */}
          <motion.div
            className="absolute inset-0"
            exit={{
              opacity: 0,
              y: -28,
              transition: { duration: 0.34 * k, ease },
            }}
          >
            {/* Top caption */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9 * k, delay: 0.5 * k }}
              className="absolute inset-x-0 top-8 text-center font-mono text-[9px] uppercase tracking-[0.5em] text-muted-foreground/70 sm:top-10 sm:text-[10px]"
            >
              A Quiet Instrument for Modern Commerce
            </motion.p>

            {/* Centre lockup */}
            <div className="flex h-full flex-col items-center justify-center">
              {/* The sun draws itself */}
              <svg viewBox="0 0 40 40" fill="none" className="size-24 text-foreground sm:size-28">
                {/* crescent first */}
                <motion.path
                  d="M 14 17 A 6 6 0 0 1 26 17"
                  stroke={SUN_GOLD}
                  strokeWidth={2}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { duration: 0.8 * k, delay: 0.25 * k, ease },
                    opacity: { duration: 0.2 * k, delay: 0.25 * k },
                  }}
                />
                {/* rays sweep around the arc one by one */}
                {rays.map((r, i) => (
                  <motion.line
                    key={i}
                    x1={r.x1.toFixed(2)}
                    y1={r.y1.toFixed(2)}
                    x2={r.x2.toFixed(2)}
                    y2={r.y2.toFixed(2)}
                    stroke={SUN_GOLD}
                    strokeWidth={1.05}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: {
                        duration: 0.45 * k,
                        delay: (0.55 + i * 0.05) * k,
                        ease,
                      },
                      opacity: {
                        duration: 0.15 * k,
                        delay: (0.55 + i * 0.05) * k,
                      },
                    }}
                  />
                ))}
                {/* the serif S condenses in */}
                <motion.text
                  x={20}
                  y={38}
                  textAnchor="middle"
                  fill="currentColor"
                  style={{
                    fontFamily:
                      "var(--font-playfair), Georgia, 'Times New Roman', serif",
                    fontSize: "27px",
                    fontWeight: 500,
                  }}
                  initial={{ opacity: 0, filter: "blur(6px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.7 * k, delay: 0.95 * k, ease }}
                >
                  S
                </motion.text>
              </svg>

              {/* SOLARIS — letters rise out of a baseline mask */}
              <div className="relative mt-7">
                <div className="flex gap-[0.3em] overflow-hidden pl-[0.3em] font-display text-3xl font-medium sm:text-4xl">
                  {word.map((c, i) => (
                    <span key={i} className="overflow-hidden">
                      <motion.span
                        className="block"
                        initial={{ y: "115%" }}
                        animate={{ y: 0 }}
                        transition={{
                          duration: 0.75 * k,
                          delay: (1.0 + i * 0.055) * k,
                          ease,
                        }}
                      >
                        {c}
                      </motion.span>
                    </span>
                  ))}
                </div>

                {/* gold light-band sweeps the lockup once */}
                <motion.span
                  className="pointer-events-none absolute -inset-y-10 w-1/3 blur-md"
                  style={{
                    background: `linear-gradient(100deg, transparent, ${SUN_GOLD}55, transparent)`,
                    transform: "skewX(-18deg)",
                  }}
                  initial={{ x: "-180%", opacity: 0 }}
                  animate={{ x: "320%", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.9 * k, delay: 1.55 * k, ease: "easeInOut" }}
                />
              </div>

              {/* DIAMOND — hairlines pull out from the centre */}
              <div className="mt-4 flex items-center gap-3">
                <motion.span
                  className="h-px w-9"
                  style={{ backgroundColor: SUN_GOLD }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.6 * k, delay: 1.5 * k, ease }}
                />
                <motion.span
                  initial={{ opacity: 0, letterSpacing: "0.2em" }}
                  animate={{ opacity: 1, letterSpacing: "0.45em" }}
                  transition={{ duration: 0.8 * k, delay: 1.45 * k, ease }}
                  className="font-mono text-[11px] uppercase text-muted-foreground"
                >
                  Diamond
                </motion.span>
                <motion.span
                  className="h-px w-9"
                  style={{ backgroundColor: SUN_GOLD }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.6 * k, delay: 1.5 * k, ease }}
                />
              </div>
            </div>

            {/* Giant editorial counter — bottom left */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 * k, delay: 0.35 * k, ease }}
              className="absolute bottom-7 left-6 sm:bottom-10 sm:left-10"
            >
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.4em] text-muted-foreground/70">
                Composing
              </p>
              <p className="font-display text-6xl font-normal italic leading-none tracking-[-0.02em] text-foreground/90 tabular-nums sm:text-8xl">
                {progress}
                <span className="ml-1 align-top font-mono text-xs not-italic tracking-normal text-muted-foreground sm:text-sm">
                  %
                </span>
              </p>
            </motion.div>

            {/* Edition mark — bottom right */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9 * k, delay: 0.6 * k }}
              className="absolute bottom-8 right-6 text-right font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground/70 sm:bottom-11 sm:right-10 sm:text-[10px]"
            >
              <p>Est. MMXXV</p>
              <p className="mt-1">Vol. I · № 001</p>
            </motion.div>

            {/* Progress hairline along the very bottom */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-border">
              <div
                className="h-full origin-left"
                style={{
                  backgroundColor: SUN_GOLD,
                  transform: `scaleX(${progress / 100})`,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
