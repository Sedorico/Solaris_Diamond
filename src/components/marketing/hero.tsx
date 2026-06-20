"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1.1, ease, delay: 0.2 + 0.13 * i },
  }),
};

const fade = {
  hidden: { opacity: 0 },
  show: (i: number) => ({
    opacity: 1,
    transition: { duration: 1.4, ease, delay: 0.35 + 0.13 * i },
  }),
};

const rule = {
  hidden: { scaleX: 0 },
  show: (i: number) => ({
    scaleX: 1,
    transition: { duration: 1.4, ease, delay: 0.35 + 0.15 * i },
  }),
};

export function Hero() {
  return (
    <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pt-28 pb-16 sm:px-10 sm:pt-32">
      {/* ─────────── Top dateline (sits below the transparent navbar) ─────────── */}
      <motion.header
        custom={0}
        variants={fade}
        initial="hidden"
        animate="show"
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
        animate="show"
        className="mt-6 h-px origin-left bg-gradient-to-r from-foreground/35 via-foreground/15 to-transparent"
      />

      {/* ─────────── Hero content ─────────── */}
      <div className="relative flex flex-1 flex-col justify-center pt-20 pb-12 sm:pt-32">
        {/* Edition mark — tiny serif "chapter" marker, top-left over the headline */}
        <motion.div
          custom={2}
          variants={rise}
          initial="hidden"
          animate="show"
          className="mb-10 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
        >
          <span className="font-display text-2xl italic font-normal text-accent">i.</span>
          <span>The Composition</span>
          <span className="h-px w-12 bg-accent/40" />
        </motion.div>

        {/* ─────────── Editorial headline ─────────── */}
        <motion.h1
          custom={3}
          variants={rise}
          initial="hidden"
          animate="show"
          className="font-display text-balance text-[2.6rem] font-normal leading-[1.02] tracking-[-0.015em] sm:text-7xl md:text-[5.5rem] lg:text-[6.4rem]"
        >
          An operating system,
          <br className="hidden sm:block" />{" "}
          <span className="italic font-normal text-gradient-accent">considered</span>
          {" "}as a craft.
        </motion.h1>

        {/* ─────────── Two-column lockup below the headline ─────────── */}
        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          {/* Left: refined intro paragraph */}
          <motion.div
            custom={4}
            variants={rise}
            initial="hidden"
            animate="show"
            className="md:col-span-6 lg:col-span-5"
          >
            <p className="max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-[17px] sm:leading-[1.7]">
              Inventory, sales, expenses, point of sale and attendance —
              composed into a single, unhurried system, made for operators who
              would rather be precise than busy.
            </p>

            {/* CTAs — same buttons, sharper rhythm */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" variant="accent" className="px-7">
                <Link href="/register">
                  Begin <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Link
                href="/services"
                className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em] text-foreground transition-colors hover:text-accent"
              >
                <span className="h-px w-8 bg-foreground/40 transition-all group-hover:w-12 group-hover:bg-accent" />
                Discover the work
              </Link>
            </div>
          </motion.div>

          {/* Right: editorial index — the table of contents for the OS itself */}
          <motion.aside
            custom={5}
            variants={rise}
            initial="hidden"
            animate="show"
            className="md:col-span-6 md:pl-10 lg:col-span-6 lg:col-start-8 lg:pl-0"
          >
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground/70">
              The Index
            </p>
            <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
              {indexItems.map((item, i) => (
                <li
                  key={item.title}
                  className="flex items-baseline justify-between gap-6 py-3.5"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-lg italic text-foreground/95">
                      {item.title}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                    {item.tag}
                  </span>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>
      </div>

      {/* ─────────── Bottom dateline ─────────── */}
      <motion.footer
        custom={6}
        variants={fade}
        initial="hidden"
        animate="show"
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
          <span className="h-px w-10 bg-foreground/30" />
        </div>
      </motion.footer>
    </section>
  );
}

const indexItems = [
  { title: "Inventory", tag: "Module I" },
  { title: "Sales & Point of Sale", tag: "Module II" },
  { title: "Expenses", tag: "Module III" },
  { title: "Attendance", tag: "Module IV" },
  { title: "Bundles & Pricing", tag: "Composition" },
];
