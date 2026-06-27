"use client";

import { motion } from "motion/react";
import { Wifi } from "lucide-react";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { SolarisMark } from "@/components/logo";
import { cn } from "@/lib/utils";

type Finish = { bg: string; text: string; sub: string };

const GOLD: Finish = {
  bg: "linear-gradient(150deg,#F4CE73 0%,#D49B45 38%,#9A6A28 72%,#6E4A1C 100%)",
  text: "text-[#3b2709]",
  sub: "text-[#3b2709]/55",
};
const PLATINUM: Finish = {
  bg: "linear-gradient(150deg,#FAFBFC 0%,#D2D6DC 42%,#A6ACB6 74%,#868C96 100%)",
  text: "text-[#2b2f36]",
  sub: "text-[#2b2f36]/55",
};
const EMERALD: Finish = {
  bg: "linear-gradient(150deg,#2E8E72 0%,#15564A 46%,#0A332C 100%)",
  text: "text-emerald-50",
  sub: "text-emerald-100/60",
};
const OBSIDIAN: Finish = {
  bg: "linear-gradient(150deg,#3a3a42 0%,#1a1a1e 46%,#08080a 100%)",
  text: "text-zinc-50",
  sub: "text-amber-200/70",
};

const CARDS: {
  id: "gcash" | "maya" | "paypal" | "bank";
  name: string;
  label: string;
  last4: string;
  finish: Finish;
  x: number;
  z: number;
}[] = [
  { id: "gcash", name: "GCash", label: "E-Wallet", last4: "8472", finish: EMERALD, x: -300, z: 10 },
  { id: "maya", name: "Maya", label: "E-Wallet", last4: "1290", finish: OBSIDIAN, x: -100, z: 20 },
  { id: "paypal", name: "PayPal", label: "Global", last4: "0455", finish: GOLD, x: 100, z: 30 },
  { id: "bank", name: "Bank Transfer", label: "InstaPay", last4: "7731", finish: PLATINUM, x: 300, z: 40 },
];

// Level row, uniform slant.
const SLANT = -20;

export function PaymentShowcase({ withHeading = true }: { withHeading?: boolean }) {
  return (
    <section
      id="payment"
      className={cn("mx-auto w-full max-w-6xl px-6", withHeading ? "mt-40" : "mt-12")}
    >
      {withHeading && (
        <EditorialHeading
          roman="v."
          label="The Payment"
          title={
            <>
              Pay your way,{" "}
              <span className="italic text-gradient-accent">securely.</span>
            </>
          }
          description="Every plan is billed in PHP and processed through PayMongo with bank-grade security. Use the wallet, card or bank you already trust."
        />
      )}

      {/* Fanned cards stage — fixed design size scaled responsively */}
      <div className="relative mt-12 h-[145px] overflow-hidden sm:h-[200px] md:h-[255px] lg:h-[350px]">
        <div className="absolute left-1/2 top-1/2 h-[320px] w-[940px] -translate-x-1/2 -translate-y-1/2 scale-[0.4] sm:scale-[0.6] md:scale-[0.76] lg:scale-[1.05]">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.id}
              className="absolute inset-0 m-auto h-[202px] w-[320px] overflow-hidden rounded-2xl border border-white/15 p-5"
              style={{
                zIndex: c.z,
                background: c.finish.bg,
                boxShadow: "0 26px 55px -18px rgba(0,0,0,0.55)",
              }}
              // Deal-out: start stacked like a deck in hand, then lay each card
              // onto the table into its level, slanted position.
              initial={{ x: 0, y: -34, rotate: -5, scale: 0.94, opacity: 0 }}
              whileInView={{
                x: c.x,
                y: 0,
                rotate: SLANT,
                scale: 1,
                opacity: 1,
                transition: { type: "spring", stiffness: 150, damping: 18, delay: i * 0.13 },
              }}
              viewport={{ once: true, margin: "-120px" }}
              whileHover={{
                y: -26,
                scale: 1.05,
                zIndex: 60,
                transition: { type: "spring", stiffness: 260, damping: 22 },
              }}
            >
              {/* Glossy diagonal sheen */}
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(118deg, rgba(255,255,255,0.5) 0%, transparent 38%, transparent 62%, rgba(255,255,255,0.12) 100%)",
                }}
              />
              {/* Fine guilloché texture */}
              <span
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, #000 0 1px, transparent 1px 7px)",
                }}
              />
              {/* Metallic inner hairline */}
              <span className="pointer-events-none absolute inset-[3px] rounded-[14px] border border-white/12" />
              {/* Faded diamond emblem watermark */}
              <svg
                viewBox="0 0 100 100"
                className={cn("pointer-events-none absolute -right-5 -top-6 size-40 opacity-[0.08]", c.finish.text)}
              >
                <path d="M50 3 L97 50 L50 97 L3 50 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M50 24 L76 50 L50 76 L24 50 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 50 H97 M50 3 V97" stroke="currentColor" strokeWidth="0.75" />
              </svg>

              {/* Card content */}
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <span className={cn("flex items-center gap-2", c.finish.text)}>
                    <SolarisMark className="size-8" />
                    <span className="font-display text-[13px] font-semibold leading-none tracking-tight">
                      Solaris<span className="font-normal opacity-70"> Diamond</span>
                    </span>
                  </span>
                  <Wifi className={cn("size-5 rotate-90", c.finish.sub)} />
                </div>

                <div className="mt-3 flex items-center gap-2.5">
                  {/* EMV gold chip */}
                  <div
                    className="relative h-7 w-10 overflow-hidden rounded-md ring-1 ring-black/20"
                    style={{ background: "linear-gradient(135deg,#F2D277,#CA9C47 55%,#946a2d)" }}
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(0,0,0,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.22) 1px,transparent 1px)",
                        backgroundSize: "100% 34%, 34% 100%",
                      }}
                    />
                  </div>
                  {/* Holographic foil */}
                  <div
                    className="size-7 rounded-md opacity-50"
                    style={{
                      background:
                        "conic-gradient(from 210deg,#ff9aef,#9af0ff,#b6ff9a,#ffe89a,#ff9aef)",
                    }}
                  />
                </div>

                <div className="mt-auto">
                  <p
                    className={cn("font-mono text-[15px] tracking-[0.2em]", c.finish.text)}
                    style={{ textShadow: "0 1px 0 rgba(255,255,255,0.22)" }}
                  >
                    ••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;{c.last4}
                  </p>

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className={cn("text-[8px] font-medium uppercase tracking-[0.25em]", c.finish.sub)}>
                        Payment method
                      </p>
                      <p
                        className={cn("font-display text-xl font-semibold leading-tight", c.finish.text)}
                        style={{ textShadow: "0 1px 0 rgba(255,255,255,0.2)" }}
                      >
                        {c.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-medium uppercase tracking-[0.2em]", c.finish.sub)}>
                        {c.label}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/payments/${c.id}.svg`}
                        alt={c.name}
                        className="h-4 w-auto max-w-[60px] object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div className="mt-6 text-center">
        <p className="text-sm text-foreground/80">GCash · Maya · PayPal · Bank Transfer</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Secured by PayMongo · credit &amp; debit cards also accepted at checkout
        </p>
      </div>
    </section>
  );
}
