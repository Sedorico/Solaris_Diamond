"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { paymentMethods, type PaymentMethod } from "@/lib/payments/methods";
import { PaymentBrandIcon } from "@/components/checkout/payment-brand-icon";
import { getIcon } from "@/components/icon-map";
import { cn } from "@/lib/utils";

// Resting tilt for each card when fanned out on desktop.
const ROTATIONS = [-12, -4, 4, 12];

export function PaymentCards() {
  // Fan + overlap only on md+; stacked straight on mobile.
  const [fanned, setFanned] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setFanned(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-6 md:flex-row md:justify-center md:gap-0 md:py-14">
      {paymentMethods.map((m, i) => (
        <PaymentCard key={m.id} method={m} index={i} fanned={fanned} />
      ))}
    </div>
  );
}

function PaymentCard({
  method,
  index,
  fanned,
}: {
  method: PaymentMethod;
  index: number;
  fanned: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = getIcon(method.icon);
  const rotate = fanned ? ROTATIONS[index] ?? 0 : 0;

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0, rotate }}
      whileHover={{ rotate: 0, y: -26, scale: 1.07 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      style={{
        zIndex: hovered ? 50 : index + 1,
        background: `linear-gradient(140deg, ${method.brand} 0%, color-mix(in oklch, ${method.brand} 46%, #0a0a0a) 100%)`,
      }}
      className={cn(
        "group relative aspect-[1.6/1] w-64 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/15 text-white shadow-xl sm:w-72 md:w-60",
        index > 0 && "md:-ml-24",
      )}
    >
      {/* Faint themed watermark — like the dragon on the membership cards. */}
      <Icon className="pointer-events-none absolute -right-5 -top-3 size-36 text-white/10 transition-transform duration-700 ease-out group-hover:rotate-6 group-hover:scale-110" />
      {/* Static gloss + extra sheen that brightens on hover. */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-white/5 to-transparent" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      {/* Brand mark, like the card chip. */}
      <PaymentBrandIcon
        id={method.id}
        className="absolute left-5 top-5 size-10 rounded-lg shadow-md ring-1 ring-white/20"
      />
      {/* Name + tagline, embossed like the membership tier. */}
      <div className="absolute inset-x-5 bottom-5">
        <p className="font-display text-2xl font-semibold leading-none drop-shadow-sm">
          {method.name}
        </p>
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.25em] text-white/75">
          {method.tagline}
        </p>
      </div>
    </motion.div>
  );
}
