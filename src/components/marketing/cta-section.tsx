"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { SmokeScene } from "@/components/three/smoke";
import { cn } from "@/lib/utils";
import { useConcierge } from "@/lib/store/concierge";

/**
 * One "window into a deeper layer".
 *
 * The scene lives on its own isolated background layer: a single `position:
 * fixed` element pinned to the viewport, sitting behind the whole page
 * (`-z-[1]` is in front of the global mesh shader at `-z-10`, but behind every
 * normal section). A scroll-driven `clip-path` reveals that fixed layer only
 * across the band currently occupied by the normal-flow window spacer — so the
 * scene reads as a deeper layer the page glides over. Nothing else is touched.
 */
function RevealLayer({ children }: { children: ReactNode }) {
  const windowRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = windowRef.current;
    const layer = layerRef.current;
    if (!win || !layer) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = win.getBoundingClientRect();
      const vh = window.innerHeight;

      if (rect.bottom <= 0 || rect.top >= vh) {
        layer.style.visibility = "hidden";
        return;
      }

      layer.style.visibility = "visible";
      const top = Math.max(0, rect.top);
      const bottom = Math.max(0, vh - rect.bottom);
      layer.style.clipPath = `inset(${top}px 0px ${bottom}px 0px)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={layerRef}
        className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden bg-background"
        style={{ visibility: "hidden", clipPath: "inset(50% 0px 50% 0px)" }}
      >
        {children}
      </div>
      <div ref={windowRef} aria-hidden className="pointer-events-none h-[90vh]" />
    </>
  );
}

// ── Concierge knowledge base ────────────────────────────────────────────────
type Reply = { label: string; answer: string };

const QUICK_REPLIES: Reply[] = [
  {
    label: "Pricing",
    answer:
      "Our plans open with a flexible monthly tier and rise to annual compositions with the finest value. Shall I find the one that suits you?",
  },
  {
    label: "Appointment",
    answer:
      "With pleasure. I can hold a slot for you — which date, hour, and service shall I note down?",
  },
  {
    label: "Hours",
    answer:
      "We keep our doors Monday through Saturday, 9 in the morning until 7 in the evening. Sundays, by appointment.",
  },
  {
    label: "A human",
    answer:
      "Of course. I'll bring in a Solaris admin — leave your name and the best way to reach you, and they'll attend to you shortly.",
  },
];

type ChatMessage = { id: number; from: "bot" | "user"; text: string };

const GREETING: ChatMessage = {
  id: 0,
  from: "bot",
  text: "Good day. I'm the Solaris concierge — choose a subject below, or simply write. A human admin is never far.",
};

// Editorial contact register — numbered, hairline-ruled, no cards. Each row is
// a real, clickable channel.
const REGISTER = [
  {
    no: "i",
    label: "Email",
    detail: "solarisdiems@gmail.com",
    href: "mailto:solarisdiems@gmail.com",
  },
  {
    no: "ii",
    label: "Facebook",
    detail: "Message us",
    href: "https://www.facebook.com/profile.php?id=61590597993727",
    external: true,
  },
  {
    no: "iii",
    label: "Phone",
    detail: "0924 126 1246",
    href: "tel:+639241261246",
  },
];

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.42 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

// Slow, breathing accent dot — a refined "available" mark, not a SaaS badge.
function LiveDot() {
  return (
    <span className="relative flex size-1.5">
      <motion.span
        className="absolute inset-0 rounded-full bg-accent"
        animate={{ scale: [1, 2.6, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative size-1.5 rounded-full bg-accent" />
    </span>
  );
}

// ── The conversation — typeset as a dialogue, not chat bubbles ──────────────
function Conversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pushBot = (text: string) => {
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: idRef.current++, from: "bot", text }]);
    }, 850);
    timers.current.push(t);
  };

  const send = (text: string, answer?: string) => {
    const value = text.trim();
    if (!value) return;
    setMessages((m) => [...m, { id: idRef.current++, from: "user", text: value }]);
    pushBot(
      answer ??
        "Noted with thanks — an admin will follow up shortly. In the meantime, do choose any subject below.",
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Speaker line */}
      <div className="flex items-end justify-between gap-4 border-b border-foreground/15 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            In conversation with
          </p>
          <p className="font-display mt-1.5 text-2xl italic tracking-[-0.01em]">
            Solaris Admin
          </p>
        </div>
        <span className="flex items-center gap-2 pb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <LiveDot />
          Available
        </span>
      </div>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-7 overflow-y-auto py-7 pr-1"
      >
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn("max-w-[88%]", m.from === "user" && "ml-auto text-right")}
          >
            <p
              className={cn(
                "mb-2 font-mono text-[9px] uppercase tracking-[0.4em]",
                m.from === "user"
                  ? "text-muted-foreground"
                  : "text-accent [text-shadow:none]",
              )}
            >
              {m.from === "user" ? "You" : "Solaris"}
            </p>
            <p
              className={cn(
                "font-display text-pretty text-base leading-relaxed sm:text-[17px]",
                m.from === "user"
                  ? "inline-block border-r-2 border-accent pr-4 text-foreground"
                  : "border-l-2 border-foreground/15 pl-4 text-foreground/90",
              )}
            >
              {m.text}
            </p>
          </motion.div>
        ))}

        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-[88%]"
            >
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.4em] text-accent [text-shadow:none]">
                Solaris
              </p>
              <span className="flex gap-1.5 border-l-2 border-foreground/15 pl-4">
                {[0, 0.18, 0.36].map((d) => (
                  <motion.span
                    key={d}
                    className="size-1 rounded-full bg-foreground/40"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: d }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subjects — understated underline links, not pills */}
      <div className="flex flex-wrap gap-x-7 gap-y-3 border-t border-foreground/15 pt-5">
        {QUICK_REPLIES.map((r) => (
          <button
            key={r.label}
            onClick={() => send(r.label, r.answer)}
            className="group font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="border-b border-transparent pb-1 transition-colors duration-300 group-hover:border-accent">
              {r.label}
            </span>
          </button>
        ))}
      </div>

      {/* Composer — a single editorial line, not a boxed input */}
      <form
        onSubmit={onSubmit}
        className="mt-5 flex items-center gap-4 border-b border-foreground/25 pb-3 transition-colors focus-within:border-accent"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:italic placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send"
          className="text-muted-foreground transition-all duration-300 hover:text-accent disabled:opacity-25"
        >
          <ArrowRight className="size-5" />
        </button>
      </form>
    </div>
  );
}

// ── The fullscreen concierge takeover ───────────────────────────────────────
function SupportOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // The veil grows in HEIGHT from a thin centred line up to the full viewport,
  // visibly opening up + down into a fullscreen takeover.
  const [vh, setVh] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 z-[120] overflow-hidden bg-black"
    >
      {/* Living shader, full bleed. */}
      <div className="absolute inset-0">
        <SmokeScene />
      </div>

      {/* Close — a hairline mark, top-right. */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.7 } }}
        onClick={onClose}
        aria-label="Close concierge"
        className="group absolute right-7 top-7 z-20 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/70 transition-colors hover:text-foreground"
      >
        Close
        <span className="relative flex size-9 items-center justify-center rounded-full border border-foreground/25 transition-colors group-hover:border-accent">
          <span className="absolute h-[1px] w-3.5 rotate-45 bg-current" />
          <span className="absolute h-[1px] w-3.5 -rotate-45 bg-current" />
        </span>
      </motion.button>

      {/* The growing veil: a soft frosted sheet over the smoke (no hard dim,
          no boxed card). Its height animates up + down to fullscreen; content
          is pinned to the viewport height so it never squishes. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <motion.div
          initial={{ height: 44 }}
          animate={{ height: vh }}
          exit={{ height: 44, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="w-full overflow-hidden bg-background/25 backdrop-blur-[5px]"
        >
          {/* Hairline frame top + bottom for an editorial "plate". */}
          <div
            style={{ height: vh }}
            className="relative flex flex-col"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

            <motion.div
              variants={containerV}
              initial="hidden"
              animate="show"
              className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-7 sm:px-12"
            >
              {/* Masthead */}
              <motion.div
                variants={itemV}
                className="flex items-center justify-center gap-5 pb-8 pt-12"
              >
                <span className="h-[1px] w-10 bg-foreground/40" />
                <span className="font-display text-base italic text-foreground">
                  Solaris · Concierge
                </span>
                <span className="h-[1px] w-10 bg-foreground/40" />
              </motion.div>

              {/* Split: statement | conversation, divided by a single rule */}
              <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-y-10 pb-12 lg:grid-cols-[1fr_1px_1fr] lg:grid-rows-1 lg:gap-x-12 xl:gap-x-16">
                {/* ── Left: the editorial statement + register ── */}
                <motion.div
                  variants={itemV}
                  className="flex flex-col justify-center"
                >
                  <span className="font-display text-2xl font-normal italic text-accent [text-shadow:none]">
                    vii.
                  </span>
                  <h2 className="font-display mt-4 text-balance text-6xl font-normal italic leading-[1.02] tracking-[-0.02em] [text-shadow:none] sm:text-7xl">
                    How may we
                    <br />
                    <span className="text-gradient-accent">help</span> you?
                  </h2>
                  <p className="font-display mt-7 max-w-sm text-pretty text-xl leading-relaxed text-foreground">
                    Real people, composed and unhurried. Begin a live exchange
                    with an admin, or reach us however you prefer.
                  </p>

                  {/* Contact register — hero-index styling */}
                  <ul className="mt-10 max-w-md border-t border-foreground/15">
                    {REGISTER.map((r) => (
                      <li key={r.label} className="border-b border-foreground/15">
                        <a
                          href={r.href}
                          {...(r.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="group flex items-baseline justify-between gap-6 py-4"
                        >
                          <span className="flex items-baseline gap-4">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/45">
                              {r.no}
                            </span>
                            <span className="font-display text-lg italic text-foreground/95 transition-colors group-hover:text-accent">
                              {r.label}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground transition-colors group-hover:text-accent">
                            {r.detail}
                            <ArrowUpRight className="size-3 -translate-x-1 text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Vertical hairline */}
                <div className="hidden bg-foreground/15 lg:block" />

                {/* ── Right: the conversation ── */}
                <motion.div variants={itemV} className="flex min-h-0 flex-col">
                  <Conversation />
                </motion.div>
              </div>
            </motion.div>

            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Collapsed invite (inside the scroll-reveal window) ──────────────────────
function ContactInvite() {
  const setOpen = useConcierge((s) => s.setOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto relative w-[min(92vw,40rem)] text-center"
    >
      <div className="flex items-center justify-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/75">
        <span className="font-display text-2xl font-normal italic text-accent">
          vii.
        </span>
        <span>Concierge</span>
      </div>

      <h2 className="font-display mt-8 text-balance text-6xl font-normal italic leading-[1.02] tracking-[-0.02em] [text-shadow:none] sm:text-7xl">
        Speak with
        <br />
        <span className="text-gradient-accent">someone</span>.
      </h2>
      <p className="font-display mx-auto mt-6 max-w-md text-pretty text-xl leading-relaxed text-foreground">
        For pricing, bookings, or anything at all — our admins are a single
        message away.
      </p>

      <button
        onClick={() => setOpen(true)}
        className="group mx-auto mt-10 inline-flex items-center gap-3 font-display text-2xl italic text-foreground transition-colors hover:text-accent"
      >
        <span className="h-[1px] w-8 bg-foreground/40 transition-all duration-300 group-hover:w-12 group-hover:bg-accent" />
        Open the concierge
        <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </button>
    </motion.div>
  );
}

/**
 * The single, globally-mounted concierge overlay. Mount once (in the marketing
 * layout); any surface opens it via the `useConcierge` store. Rendered through
 * a portal so it escapes section stacking contexts.
 */
export function Concierge() {
  const open = useConcierge((s) => s.open);
  const setOpen = useConcierge((s) => s.setOpen);
  // Portal target only exists on the client; lazy-init avoids a
  // setState-in-effect while keeping SSR safe.
  const [mounted] = useState(() => typeof document !== "undefined");
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && <SupportOverlay onClose={() => setOpen(false)} />}
    </AnimatePresence>,
    document.body,
  );
}

export function CtaSection() {
  return (
    <section className="relative">
      <RevealLayer>
        <SmokeScene />
      </RevealLayer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
        <ContactInvite />
      </div>
    </section>
  );
}
