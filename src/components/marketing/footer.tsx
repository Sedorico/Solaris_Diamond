"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import { Logo, SolarisMark } from "@/components/logo";
import { footerNav, siteConfig } from "@/lib/config/site";
import { Magnetic } from "@/components/motion/magnetic";
import { LiveClock } from "@/components/motion/live-clock";

const ease = [0.22, 1, 0.36, 1] as const;

// Editorial correspondence register — numbered like the concierge contact
// plate: roman numeral, mono label, serif italic value.
const register = [
  {
    no: "i",
    label: "Email",
    value: "solarisdiems@gmail.com",
    href: "mailto:solarisdiems@gmail.com",
  },
  {
    no: "ii",
    label: "Phone",
    value: "0924 126 1246",
    href: "tel:09241261246",
  },
  {
    no: "iii",
    label: "Facebook",
    value: "Message us",
    href: "https://www.facebook.com/profile.php?id=61590597993727",
    external: true,
  },
];

type FooterLink = { title: string; href: string };

// Normalise the readonly `as const` config into one mutable, uniformly-typed
// shape so the render code below stays simple.
const groups: { title: string; links: FooterLink[] }[] = footerNav.map(
  (group) => ({
    title: group.title,
    links: (group.links as readonly FooterLink[]).filter(
      (l) => l.title !== "Careers" && l.title !== "Blog",
    ),
  }),
);

// Product + Company become the numbered editorial index; Resources + Legal are
// flattened into the slim meta bar.
const indexLinks = groups
  .filter((g) => g.title === "Product" || g.title === "Company")
  .flatMap((g) => g.links);
const bottomLinks = groups
  .filter((g) => g.title === "Resources" || g.title === "Legal")
  .flatMap((g) => g.links);

/** One masked word — rises out of its own baseline (same DNA as the hero). */
function MaskedWord({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <span className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom">
      <motion.span
        className={`inline-block ${className ?? ""}`}
        initial={{ y: "115%", rotate: 2 }}
        whileInView={{ y: 0, rotate: 0 }}
        viewport={{ once: true, margin: "-8% 0px" }}
        transition={{ duration: 0.9, ease, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/**
 * The oversized brand flourish. Letters live as hairline outlines; a molten,
 * slowly-swirling gold fill exists only inside a spring-smoothed spotlight
 * that trails the cursor — with a blurred bloom layer underneath so the type
 * genuinely glows. When the wordmark first scrolls into view, the spotlight
 * performs one cinematic sweep across the whole name, then hands control to
 * the cursor.
 */
function BrandFlourish() {
  const areaRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const hovering = useRef(false);
  const inView = useInView(areaRef, { once: true, margin: "-12% 0px" });

  const mx = useMotionValue(-600);
  const my = useMotionValue(90);
  const glow = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 110, damping: 22, mass: 0.55 });
  const sy = useSpring(my, { stiffness: 110, damping: 22, mass: 0.55 });
  const sGlow = useSpring(glow, { stiffness: 80, damping: 22 });

  const mask = useMotionTemplate`radial-gradient(300px circle at ${sx}px ${sy}px, black 28%, rgba(0,0,0,0.4) 55%, transparent 78%)`;

  // One cinematic sweep on first sight, then dim (unless the cursor is in).
  useEffect(() => {
    if (!inView) return;
    const el = fillRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    my.jump(rect.height * 0.55);
    mx.jump(-rect.width * 0.12);
    glow.set(1);
    const sweep = animate(mx, rect.width * 1.12, {
      duration: 2.0,
      ease: [0.45, 0, 0.25, 1],
    });
    const dim = window.setTimeout(() => {
      if (!hovering.current) glow.set(0);
    }, 2300);
    return () => {
      sweep.stop();
      window.clearTimeout(dim);
    };
  }, [inView, mx, my, glow]);

  const onMove = (e: React.PointerEvent) => {
    const el = fillRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    hovering.current = true;
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
    glow.set(1);
  };
  const onLeave = () => {
    hovering.current = false;
    glow.set(0);
  };

  const moltenGold =
    "linear-gradient(100deg, #8A5A22 0%, #C98A3C 22%, #F2CE8B 48%, #C98A3C 74%, #8A5A22 100%)";
  const wordmarkClass =
    "font-display block w-full select-none whitespace-nowrap text-center text-[10.3vw] font-medium leading-none tracking-tight";

  return (
    <motion.div
      ref={areaRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 1.1, ease }}
      className="relative cursor-default"
    >
      {/* Base — hairline-outlined letters with a whisper of fill */}
      <span
        aria-hidden
        className={`${wordmarkClass} pointer-events-none text-foreground/15`}
        style={{
          color: "transparent",
          WebkitTextStroke: "1px currentColor",
        }}
      >
        SOLARIS DIAMOND
      </span>

      {/* Bloom — blurred molten layer under the crisp fill, so it GLOWS */}
      <motion.span
        aria-hidden
        className={`${wordmarkClass} pointer-events-none absolute inset-x-0 bottom-0 blur-[14px]`}
        animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        style={{
          color: "transparent",
          backgroundImage: moltenGold,
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          maskImage: mask,
          WebkitMaskImage: mask,
          opacity: sGlow,
        }}
      >
        SOLARIS DIAMOND
      </motion.span>

      {/* Crisp molten fill inside the spotlight */}
      <motion.span
        ref={fillRef}
        aria-hidden
        className={`${wordmarkClass} pointer-events-none absolute inset-x-0 bottom-0`}
        animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        style={{
          color: "transparent",
          backgroundImage: moltenGold,
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          maskImage: mask,
          WebkitMaskImage: mask,
          opacity: sGlow,
        }}
      >
        SOLARIS DIAMOND
      </motion.span>
    </motion.div>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-40 overflow-hidden border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 pt-24 sm:pt-32">
        {/* ── Interactive CTA masthead — words rise, gold sweeps "you are" ── */}
        <div className="flex flex-col gap-12 pb-20 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="flex flex-col gap-6">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.9, ease }}
              className="eyebrow flex items-center gap-3"
            >
              <motion.span
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-8% 0px" }}
                transition={{ duration: 0.8, ease, delay: 0.1 }}
                className="h-px w-8 origin-left bg-accent"
              />
              Let&apos;s begin
            </motion.span>
            <h2 className="font-display text-balance text-5xl font-normal leading-[0.95] tracking-[-0.02em] sm:text-7xl">
              <span className="block">
                <MaskedWord delay={0.1}>Ready</MaskedWord>{" "}
                <MaskedWord delay={0.18}>when</MaskedWord>
              </span>
              <span className="relative inline-block">
                <MaskedWord delay={0.28} className="italic text-gradient-accent">
                  you are.
                </MaskedWord>
                {/* one-time gold light sweep once the words land */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -inset-y-2 w-1/3 blur-[6px]"
                  style={{
                    background:
                      "linear-gradient(100deg, transparent, rgba(201,138,60,0.5), transparent)",
                    transform: "skewX(-18deg)",
                  }}
                  initial={{ x: "-160%", opacity: 0 }}
                  whileInView={{ x: "300%", opacity: [0, 1, 1, 0] }}
                  viewport={{ once: true, margin: "-8% 0px" }}
                  transition={{ duration: 1.0, ease: "easeInOut", delay: 1.05 }}
                />
              </span>
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8% 0px" }}
            transition={{ duration: 0.9, ease, delay: 0.35 }}
            className="shrink-0 self-start md:self-end"
          >
            <Magnetic strength={0.4}>
              <Link
                href="/register"
                className="group inline-flex items-center gap-5 font-display text-3xl font-normal sm:text-4xl"
              >
                Get started
                <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glow transition-transform duration-300 group-hover:scale-110 sm:size-20">
                  <ArrowUpRight className="size-6 transition-transform duration-300 group-hover:rotate-45" />
                </span>
              </Link>
            </Magnetic>
            <p className="mt-4 text-right font-mono text-[9px] uppercase tracking-[0.4em] text-muted-foreground/60">
              № 001 · The First Edition
            </p>
          </motion.div>
        </div>

        {/* ── Interactive numbered index + brand/contact ── */}
        <div className="grid gap-x-16 gap-y-14 border-t border-border pt-14 md:grid-cols-[1.5fr_1fr]">
          <nav className="grid gap-x-12 sm:grid-cols-2">
            {indexLinks.map((link, i) => (
              <motion.div
                key={link.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-6% 0px" }}
                transition={{ duration: 0.7, ease, delay: 0.08 * i }}
              >
                <Link
                  href={link.href}
                  className="group flex items-center gap-4 border-b border-border/50 py-4 transition-colors hover:border-accent/40"
                >
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50 transition-colors group-hover:text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-xl italic text-foreground/85 transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-accent sm:text-2xl">
                    {link.title}
                  </span>
                  <ArrowUpRight className="ml-auto size-4 -translate-x-2 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                </Link>
              </motion.div>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-6% 0px" }}
            transition={{ duration: 0.9, ease, delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground/70">
                Correspondence
                <span className="h-px w-10 bg-accent/40" />
              </p>
              <Logo href={null} showWord={false} />
            </div>
            <div className="border-t border-border/50">
              {register.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  target={s.external ? "_blank" : undefined}
                  className="group/c flex items-baseline justify-between gap-6 border-b border-border/50 py-4 transition-colors hover:border-accent/40"
                >
                  <span className="flex items-baseline gap-3.5">
                    <span className="font-display text-lg italic leading-none text-accent">
                      {s.no}.
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 transition-colors group-hover/c:text-accent">
                      {s.label}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-display text-base italic text-foreground/85 transition-all duration-300 group-hover/c:-translate-x-1 group-hover/c:text-accent sm:text-lg">
                      {s.value}
                    </span>
                    <ArrowUpRight className="size-3.5 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover/c:translate-x-0 group-hover/c:opacity-100" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-6 max-w-xs text-pretty font-display text-sm italic leading-relaxed text-muted-foreground">
              Composed in Manila — inventory, sales, expenses, point of sale and
              attendance, considered as one quiet instrument.
            </p>
          </motion.div>
        </div>

        {/* ── Editorial dateline strip — mirrors the hero's masthead ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-4% 0px" }}
          transition={{ duration: 1.0, ease }}
          className="mt-16"
        >
          <div className="h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent" />
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/70 sm:text-[10px]">
            <span>Est. MMXXV</span>
            <span className="hidden sm:inline">Composed in Manila</span>
            <span className="hidden md:inline tabular-nums">
              14.5° N · 121.0° E
            </span>
            <span>Vol. I · № 001</span>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent" />

          {/* ── Meta bar — appendix links + colophon line ── */}
          <div className="flex flex-col gap-6 py-7">
            <nav className="flex flex-wrap items-center gap-y-2.5">
              {bottomLinks.map((link, i) => (
                <span key={link.title} className="flex items-center">
                  {i > 0 && (
                    <span className="mx-3 text-[8px] text-accent/60">◆</span>
                  )}
                  <Link
                    href={link.href}
                    className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground underline-offset-4 transition-colors hover:text-accent hover:underline"
                  >
                    {link.title}
                  </Link>
                </span>
              ))}
            </nav>
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="font-display text-sm italic text-muted-foreground">
                © {new Date().getFullYear()} {siteConfig.name} — set with intent,
                to the last hairline.
              </p>
              <div className="flex items-center gap-6">
                <LiveClock className="eyebrow" />
                <span className="eyebrow flex items-center gap-2">
                  <span className="relative flex size-1.5">
                    <motion.span
                      className="absolute inset-0 rounded-full bg-accent"
                      animate={{ scale: [1, 2.4, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                    <span className="relative size-1.5 rounded-full bg-accent" />
                  </span>
                  All systems operational
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Oversized brand flourish — molten-gold spotlight, full-bleed ── */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-8% 0px" }}
          transition={{ duration: 1.0, ease }}
          className="flex justify-center py-6"
        >
          <SolarisMark className="size-20 text-foreground/60 transition-opacity duration-300 hover:text-foreground/90" />
        </motion.div>

        <BrandFlourish />
      </div>
    </footer>
  );
}
