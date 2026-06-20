"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Lock, Check, ArrowRight, Sparkles } from "lucide-react";
import { getService, type ServiceId } from "@/lib/data/services";
import { bundles } from "@/lib/data/bundles";
import { getIcon } from "@/components/icon-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

/**
 * Module gate shown when a tenant opens a service they haven't subscribed to.
 * Mirrors the marketing service-detail "pricing card": a two-column premium
 * card with the plan + price on the left and what's-included on the right,
 * adapted for the locked state (lock badge + subscribe CTA).
 */
export function ModuleLocked({ serviceId }: { serviceId: ServiceId }) {
  const service = getService(serviceId);
  const Icon = getIcon(service.icon);
  const inBundles = bundles.filter((b) => b.services.includes(service.id));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-premium"
      >
        <div className="grid lg:grid-cols-2">
          {/* Left — locked plan + price */}
          <div className="flex flex-col items-center justify-center p-10 text-center sm:p-14">
            <span className="relative flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Icon className="size-6" />
              <span className="absolute -bottom-2 -right-2 flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                <Lock className="size-3.5" />
              </span>
            </span>

            <span className="eyebrow mt-6 text-accent">Subscription required</span>
            <h1 className="font-display mt-3 text-3xl font-medium sm:text-[2.1rem]">
              {service.name}
            </h1>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {service.tagline}
            </p>

            <div className="mt-9 flex items-end gap-1.5">
              <span className="font-display text-6xl font-medium tabular sm:text-7xl">
                {formatCurrency(service.price)}
              </span>
              <span className="mb-2.5 text-sm text-muted-foreground">/mo</span>
            </div>

            <div className="mt-8 flex w-full max-w-xs flex-col gap-2.5">
              <Button asChild size="lg" variant="accent" className="w-full">
                <Link href={`/dashboard/subscribe/${serviceId}`}>
                  <Sparkles className="size-4" /> Subscribe now
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href="/pricing">
                  View plans <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <p className="mt-9 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Activates instantly after payment — no manual approval required.
              Cancel anytime.
            </p>
          </div>

          {/* Right — what's included */}
          <div className="flex flex-col justify-center border-t border-border bg-secondary/30 p-10 sm:p-14 lg:border-l lg:border-t-0">
            <span className="eyebrow">What&apos;s included</span>
            <ul className="mt-6 flex flex-col gap-4">
              {service.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[15px]">
                  <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>

            <p className="mt-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Unlock {service.name} on its own, or save with a bundle. Every plan
              is multi-tenant isolated and secured to bank-grade standards.
            </p>

            {inBundles.length > 0 && (
              <div className="mt-8">
                <span className="eyebrow">Also part of</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {inBundles.map((b) => (
                    <Link key={b.id} href={`/bundles#${b.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:border-accent/50"
                      >
                        {b.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stat strip */}
        <div className="flex items-center justify-between gap-4 border-t border-border px-10 py-5 sm:px-14">
          <span className="eyebrow">{service.stat.label}</span>
          <span className="font-display text-xl font-medium text-gradient-accent">
            {service.stat.value}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
