"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { faqs } from "@/lib/data/marketing";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto mt-40 w-full max-w-6xl px-6">
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        {/* ── Sticky editorial heading ── */}
        <Reveal className="md:col-span-4">
          <div className="md:sticky md:top-32">
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              <span className="font-display text-2xl font-normal italic text-accent">
                vi.
              </span>
              <span>Questions</span>
            </div>
            <h2 className="font-display mt-8 text-balance text-4xl font-normal leading-[1.05] tracking-[-0.01em] sm:text-5xl">
              Answered,
              <br />
              <span className="italic text-gradient-accent">plainly</span>.
            </h2>
            <p className="mt-5 max-w-xs text-pretty leading-relaxed text-muted-foreground">
              Everything you might want to know before you begin.
            </p>
            <Link
              href="/contact"
              className="group mt-8 inline-flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
            >
              Still curious? Talk to us
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          </div>
        </Reveal>

        {/* ── Accordion ── */}
        <div className="md:col-span-7 md:col-start-6">
          <div className="border-t border-border">
            {faqs.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={item.q}
                  className={cn(
                    "border-b border-border transition-colors duration-500",
                    isOpen && "bg-card/40",
                  )}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-4 py-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={cn(
                        "font-display text-lg font-normal italic transition-colors duration-300",
                        isOpen
                          ? "text-accent"
                          : "text-muted-foreground/45 group-hover:text-accent",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "font-display text-lg font-normal leading-snug transition-colors duration-300 sm:text-xl",
                        isOpen
                          ? "text-accent"
                          : "text-foreground group-hover:text-foreground",
                      )}
                    >
                      {item.q}
                    </span>
                    {/* Morphing +/× indicator (two hairlines) */}
                    <span className="relative flex size-5 items-center justify-center">
                      <span className="absolute h-px w-3.5 bg-current transition-colors duration-300" />
                      <span
                        className={cn(
                          "absolute h-px w-3.5 bg-current transition-transform duration-300 ease-out",
                          isOpen ? "rotate-0" : "rotate-90",
                        )}
                      />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-xl pb-7 pl-12 pr-8 text-sm leading-relaxed text-muted-foreground">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
