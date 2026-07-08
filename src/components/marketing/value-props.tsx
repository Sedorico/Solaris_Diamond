"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Check, X } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

/**
 * "Why Us" — a scroll-stacking comparison. Each card pins to the top and the
 * next slides over it, piling into a deck as you scroll (and un-piling on the
 * way back up). Every card is one promise: how Solaris does it (✓) versus the
 * patched-together way most businesses settle for (✗).
 */

type Compare = {
  good: { title: string; body: string };
  bad: { title: string; body: string };
};

const comparisons: Compare[] = [
  {
    good: {
      title: "Skilled Professional",
      body: "Gain access to top-tier talent with years of experience, ensuring flawless execution.",
    },
    bad: {
      title: "Amateur Designer",
      body: "Lack of experience may result in design inconsistencies and overlooked details.",
    },
  },
  {
    good: {
      title: "Future-Ready Designs",
      body: "Crafting modern, scalable designs that grow with your business and stay ahead of trends.",
    },
    bad: {
      title: "Outdated Concepts",
      body: "Stale designs that don't reflect current trends or your evolving brand narrative.",
    },
  },
  {
    good: {
      title: "Client-Centric Collaboration",
      body: "Your vision leads the way — we work closely with you to bring ideas to life with precision and creativity.",
    },
    bad: {
      title: "Detached Communication",
      body: "Lack of collaboration and poor feedback loops can result in misaligned outcomes.",
    },
  },
  {
    good: {
      title: "Timely Project Tracking",
      body: "Stay informed with regular progress updates and timely deliverables.",
    },
    bad: {
      title: "Unstructured & Unreliable Work",
      body: "Inconsistent timelines and last-minute changes can compromise quality.",
    },
  },
];

function CompareCard({
  item,
  index,
  isLast,
}: {
  item: Compare;
  index: number;
  isLast: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Stays crisp while it's the active card up front, then — as the next card
  // climbs over it — shrinks and fades right out to 0, so the frosted glass
  // never lets the cards behind bleed through.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.93]);
  const opacity = useTransform(scrollYProgress, [0.25, 0.7], [1, 0]);

  return (
    <div
      ref={ref}
      className="sticky"
      style={{ top: `calc(7rem + ${index * 1.5}rem)` }}
    >
      <motion.div
        style={isLast ? undefined : { scale, opacity }}
        className="group glass-solid relative origin-top overflow-hidden rounded-[2rem] p-8 sm:p-12"
      >
        {/* depth: oversized faint numeral */}
        <span className="font-display pointer-events-none absolute -top-10 right-2 select-none text-[9rem] font-normal italic leading-none text-foreground/[0.045] sm:text-[12rem]">
          {String(index + 1).padStart(2, "0")}
        </span>
        {/* soft gold glow */}
        <span className="pointer-events-none absolute -left-20 top-1/2 size-72 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl transition-colors duration-500 group-hover:bg-accent/20" />

        <div className="relative flex flex-col">
          {/* ── Status rail ── */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent/12 ring-1 ring-accent/20">
                <Check className="size-3.5" strokeWidth={2.6} />
              </span>
              With us
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* ── Hero ── */}
          <h3 className="font-display mt-8 text-balance text-4xl font-normal leading-[1.04] tracking-[-0.015em] sm:text-[3.1rem]">
            {item.good.title}
          </h3>
          <p className="mt-5 max-w-xl text-pretty leading-relaxed text-muted-foreground sm:text-lg">
            {item.good.body}
          </p>

          {/* ── The alternative — a quiet footnote ── */}
          <p className="mt-9 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <X
              className="size-3.5 shrink-0 text-muted-foreground/40"
              strokeWidth={2.6}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/45">
              Instead of
            </span>
            <span className="font-display text-base italic text-muted-foreground/55 line-through decoration-muted-foreground/25">
              {item.bad.title}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function ValueProps() {
  return (
    <section className="mx-auto mt-40 w-full max-w-6xl px-6">
      {/* ── Header ── */}
      <Reveal>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="font-display text-2xl font-normal italic text-accent">
            iii.
          </span>
          <span>Why Us</span>
          <span className="h-px w-12 bg-accent/40" />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-12">
          <h2 className="font-display text-balance text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl md:col-span-7">
            The difference,
            <br />
            made <span className="italic text-gradient-accent">plain</span>.
          </h2>
          <p className="max-w-sm self-end text-pretty leading-relaxed text-muted-foreground md:col-span-5">
            What working with the right partner looks like — and what settling
            for less quietly costs you.
          </p>
        </div>
      </Reveal>

      {/* ── Stacking comparison cards ── */}
      <div className="mt-16 flex flex-col gap-6 pb-[12vh]">
        {comparisons.map((item, i) => (
          <CompareCard
            key={item.good.title}
            item={item}
            index={i}
            isLast={i === comparisons.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
