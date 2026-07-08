"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowRight, ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { usePreloader } from "@/lib/store/preloader";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * The hero entrance is choreographed as a continuation of the preloader: every
 * animation waits for the curtains to start opening (usePreloader.revealed),
 * so the page composes itself in front of the visitor instead of having
 * finished behind the loader. Headline words rise from baseline masks, the
 * italic word gets a one-time gold light sweep, the index cascades in row by
 * row, and the whole composition floats on a subtle cursor parallax before
 * drifting away on scroll.
 */

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1.0, ease, delay: 0.1 + 0.11 * i },
  }),
};

const fade = {
  hidden: { opacity: 0 },
  show: (i: number) => ({
    opacity: 1,
    transition: { duration: 1.2, ease, delay: 0.15 + 0.11 * i },
  }),
};

const rule = {
  hidden: { scaleX: 0 },
  show: (i: number) => ({
    scaleX: 1,
    transition: { duration: 1.3, ease, delay: 0.15 + 0.13 * i },
  }),
};

/** One masked word — rises out of its own baseline like the preloader type. */
function MaskedWord({
  children,
  delay,
  revealed,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  revealed: boolean;
  className?: string;
}) {
  return (
    <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
      <motion.span
        className={`inline-block ${className ?? ""}`}
        initial={{ y: "115%", rotate: 2.5 }}
        animate={revealed ? { y: 0, rotate: 0 } : { y: "115%", rotate: 2.5 }}
        transition={{ duration: 0.95, ease, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Live Manila time — the dateline ticks like a real masthead. */
function ManilaClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time ?? "—:—:—"}</span>;
}

export function Hero() {
  const revealed = usePreloader((s) => s.revealed);
  const sectionRef = useRef<HTMLElement>(null);

  // ── Cursor parallax — the composition floats over the fixed silk ──
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 50, damping: 18, mass: 0.6 });
  const py = useSpring(my, { stiffness: 50, damping: 18, mass: 0.6 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 14);
      my.set((e.clientY / window.innerHeight - 0.5) * 10);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  // ── Scroll exit — content drifts down slower than the page and dissolves ──
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const drift = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const dissolve = useTransform(scrollYProgress, [0.35, 0.95], [1, 0]);

  const anim = revealed ? "show" : "hidden";

  // Headline choreography offsets (seconds after the curtains start opening).
  const W = 0.28; // first word
  const STEP = 0.085;

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pt-28 pb-16 sm:px-10 sm:pt-32"
    >
      <motion.div
        style={{ y: drift, opacity: dissolve }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* ─────────── Top dateline (sits below the transparent navbar) ─────────── */}
        <motion.header
          custom={0}
          variants={fade}
          initial="hidden"
          animate={anim}
          className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/80"
        >
          <span className="hidden sm:inline">Est. MMXXV</span>
          <span className="hidden flex-1 px-8 text-center md:inline">
            A Quiet Instrument for Modern Commerce
          </span>
          <span className="flex items-center gap-3">
            <span className="hidden sm:inline">Vol. I</span>
            <span>№ 001</span>
          </span>
        </motion.header>

        {/* ─────────── Hairline rule (animated draw) ─────────── */}
        <motion.div
          custom={1}
          variants={rule}
          initial="hidden"
          animate={anim}
          className="mt-6 h-px origin-left bg-gradient-to-r from-foreground/35 via-foreground/15 to-transparent"
        />

        {/* ─────────── Hero content ─────────── */}
        <motion.div
          style={{ x: px, y: py }}
          className="relative flex flex-1 flex-col justify-center pt-12 pb-10 sm:pt-16"
        >
          {/* Edition mark — letter-spacing breathes open like the preloader */}
          <div className="mb-10 flex items-center gap-4 font-mono text-[10px] uppercase text-muted-foreground">
            <motion.span
              initial={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
              animate={
                revealed
                  ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                  : { opacity: 0, scale: 0.6, filter: "blur(4px)" }
              }
              transition={{ duration: 0.8, ease, delay: 0.12 }}
              className="font-display text-2xl italic font-normal text-accent"
            >
              i.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, letterSpacing: "0.18em" }}
              animate={
                revealed
                  ? { opacity: 1, letterSpacing: "0.4em" }
                  : { opacity: 0, letterSpacing: "0.18em" }
              }
              transition={{ duration: 1.0, ease, delay: 0.18 }}
            >
              The Composition
            </motion.span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={revealed ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.3 }}
              className="h-px w-12 origin-left bg-accent/40"
            />
          </div>

          {/* ─────────── Editorial headline — words rise from baseline masks ─────────── */}
          <h1 className="font-display text-balance text-[2.6rem] font-normal leading-[1.02] tracking-[-0.015em] sm:text-7xl md:text-[5.5rem] lg:text-[6.4rem]">
            <span className="block">
              {["An", "operating", "system,"].map((w, i) => (
                <span key={w}>
                  <MaskedWord delay={W + i * STEP} revealed={revealed}>
                    {w}
                  </MaskedWord>
                  {i < 2 && " "}
                </span>
              ))}
            </span>
            <span className="block">
              <span className="relative inline-block">
                <MaskedWord
                  delay={W + 3 * STEP}
                  revealed={revealed}
                  className="italic font-normal text-gradient-accent"
                >
                  considered
                </MaskedWord>
                {/* one-time gold light sweep once the word has landed */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -inset-y-2 w-1/3 blur-[6px]"
                  style={{
                    background:
                      "linear-gradient(100deg, transparent, rgba(201,138,60,0.5), transparent)",
                    transform: "skewX(-18deg)",
                  }}
                  initial={{ x: "-160%", opacity: 0 }}
                  animate={
                    revealed
                      ? { x: "300%", opacity: [0, 1, 1, 0] }
                      : { x: "-160%", opacity: 0 }
                  }
                  transition={{ duration: 1.0, ease: "easeInOut", delay: 1.35 }}
                />
              </span>{" "}
              {["as", "a", "craft."].map((w, i) => (
                <span key={w}>
                  <MaskedWord delay={W + (4 + i) * STEP} revealed={revealed}>
                    {w}
                  </MaskedWord>
                  {i < 2 && " "}
                </span>
              ))}
            </span>
          </h1>

          {/* ─────────── Two-column lockup below the headline ─────────── */}
          <div className="mt-10 grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
            {/* Left: refined intro paragraph — condenses out of a blur */}
            <motion.div
              initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
              animate={
                revealed
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: 18, filter: "blur(8px)" }
              }
              transition={{ duration: 1.0, ease, delay: 0.75 }}
              className="md:col-span-6 lg:col-span-5"
            >
              <p className="max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-[17px] sm:leading-[1.7]">
                Inventory, sales, expenses, point of sale and attendance —
                composed into a single, unhurried system, made for operators who
                would rather be precise than busy.
              </p>

              {/* CTAs — magnetic, so they lean toward the cursor */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Magnetic strength={0.25}>
                  <Button asChild size="lg" variant="accent" className="px-7">
                    <Link href="/register">
                      Begin <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </Magnetic>
                <Link
                  href="/services"
                  className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em] text-foreground transition-colors hover:text-accent"
                >
                  <span className="h-px w-8 bg-foreground/40 transition-all group-hover:w-12 group-hover:bg-accent" />
                  Discover the work
                </Link>
              </div>
            </motion.div>

            {/* Right: editorial index — rows cascade in, then invite the hover */}
            <div className="md:col-span-6 md:pl-10 lg:col-span-6 lg:col-start-8 lg:pl-0">
              <motion.p
                initial={{ opacity: 0 }}
                animate={revealed ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.9, ease, delay: 0.8 }}
                className="mb-6 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground/70"
              >
                The Index
              </motion.p>
              <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
                {indexItems.map((item, i) => (
                  <motion.li
                    key={item.title}
                    initial={{ opacity: 0, x: -16 }}
                    animate={
                      revealed ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }
                    }
                    transition={{ duration: 0.75, ease, delay: 0.9 + i * 0.09 }}
                  >
                    <Link
                      href={item.href}
                      className="group flex items-baseline justify-between gap-6 py-3.5 transition-transform duration-300 hover:translate-x-1.5"
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70 transition-colors duration-300 group-hover:text-accent">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-display text-lg italic text-foreground/95">
                          {item.title}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                        <span className="transition-colors duration-300 group-hover:text-accent">
                          {item.tag}
                        </span>
                        <ArrowUpRight className="size-3 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* ─────────── Bottom dateline — with a live Manila clock ─────────── */}
        <motion.footer
          custom={6}
          variants={fade}
          initial="hidden"
          animate={anim}
          className="mt-auto flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70"
        >
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-foreground/30" />
            <span>The First Edition</span>
          </div>

          <Link
            href="#core"
            aria-label="Scroll"
            className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-accent"
          >
            <span>Scroll</span>
            <ArrowDown className="size-3.5 animate-float" />
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <span className="tabular-nums">14.5° N · 121.0° E</span>
            <span>·</span>
            <ManilaClock />
            <span className="h-px w-10 bg-foreground/30" />
          </div>
        </motion.footer>
      </motion.div>
    </section>
  );
}

const indexItems = [
  { title: "Inventory", tag: "Module I", href: "/services" },
  { title: "Sales & Point of Sale", tag: "Module II", href: "/services" },
  { title: "Expenses", tag: "Module III", href: "/services" },
  { title: "Attendance", tag: "Module IV", href: "/services" },
  { title: "Bundles & Pricing", tag: "Composition", href: "/bundles" },
];
