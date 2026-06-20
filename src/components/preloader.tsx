"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SolarisMark } from "@/components/logo";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Brand preloader — the Solaris Diamond mark is the very first thing a visitor
 * sees. Reveals the lockup, fills a hairline progress rule, then lifts away.
 */
export function Preloader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setDone(true), reduce ? 600 : 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => { document.body.style.overflow = ""; }, 700);
      return () => clearTimeout(t);
    }
  }, [done]);

  const word = "SOLARIS".split("");

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: "-100%" }}
          transition={{ duration: 0.8, ease }}
        >
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, ease }}
            >
              <SolarisMark className="size-20 text-foreground" />
            </motion.div>

            <div className="mt-7 flex gap-[0.32em] pl-[0.32em] font-display text-2xl font-medium sm:text-3xl">
              {word.map((c, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease, delay: 0.25 + i * 0.05 }}
                >
                  {c}
                </motion.span>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-3 flex items-center gap-3"
            >
              <span className="h-px w-8 bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-[0.45em] text-muted-foreground">
                Diamond
              </span>
              <span className="h-px w-8 bg-accent" />
            </motion.div>
          </div>

          {/* Progress rule */}
          <div className="absolute bottom-16 h-px w-48 overflow-hidden bg-border">
            <motion.div
              className="h-full bg-foreground"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.9, ease: [0.4, 0, 0.1, 1] }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
