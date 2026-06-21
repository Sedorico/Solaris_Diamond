"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Lock, ArrowUpRight, ArrowRight } from "lucide-react";
import { services } from "@/lib/data/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/hooks";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export default function DashboardOverview() {
  const { user, subscribedServices } = useSession();

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const weekday = now.toLocaleDateString("en-PH", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-PH", {
        month: "short",
        year: "numeric",
      })
    : "—";

  const unlocked = subscribedServices.length;
  const total = services.length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ─────────── Masthead — asymmetric editorial greeting ─────────── */}
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="grid gap-8 md:grid-cols-12 md:items-end"
      >
        <div className="md:col-span-8">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
            <span>
              {weekday} · {dateStr}
            </span>
            <span className="h-px w-8 bg-accent/40" />
            <span>The Console</span>
          </div>

          <h1 className="font-display mt-5 text-balance text-5xl font-normal leading-[0.98] tracking-[-0.01em] sm:text-6xl">
            {greeting},
            <br />
            <span className="italic text-gradient-accent">{firstName}.</span>
          </h1>

          {/* Profile as an inline dateline — not a boxed card */}
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="truncate">{user?.email ?? "—"}</span>
            <Dot />
            <span>{user?.businessName || "Independent"}</span>
            <Dot />
            <span>Since {memberSince}</span>
          </div>
        </div>

        {/* Composition card (glass via .glass-scope) */}
        <div className="md:col-span-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="eyebrow">Composition</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-display text-5xl font-normal leading-none tabular">
                {unlocked}
              </span>
              <span className="mb-1.5 text-sm text-muted-foreground">
                of {total} modules active
              </span>
            </div>

            <div className="mt-5 flex gap-1.5">
              {services.map((s) => (
                <span
                  key={s.id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    subscribedServices.includes(s.id)
                      ? "bg-accent"
                      : "bg-foreground/12",
                  )}
                />
              ))}
            </div>

            {unlocked < total ? (
              <Button asChild size="sm" variant="accent" className="mt-5 w-full">
                <Link href="/pricing">
                  Unlock all <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                Fully composed
              </p>
            )}
          </div>
        </div>
      </motion.header>

      {/* ─────────── The Modules — editorial tiles ─────────── */}
      <div className="mt-20 flex items-baseline justify-between">
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="font-display text-2xl font-normal italic text-accent">
            ii.
          </span>
          <span>The Modules</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/billing">
            Manage <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => {
          const isUnlocked = subscribedServices.includes(service.id);
          const href = isUnlocked
            ? `/dashboard/${service.id}`
            : `/dashboard/subscribe/${service.id}`;
          // First module is a wide feature tile — asymmetric, uncommon.
          const feature = i === 0;
          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.05, ease }}
              className={cn(feature && "sm:col-span-2 lg:col-span-2")}
            >
              <Link
                href={href}
                className={cn(
                  "group relative flex h-full min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1",
                  isUnlocked
                    ? "border-border bg-card hover:shadow-premium"
                    : "border-dashed border-border bg-card/50",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-4xl font-normal italic leading-none text-muted-foreground/25 transition-colors duration-300 group-hover:text-accent/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {isUnlocked ? (
                    <Badge variant="success">
                      <Check className="size-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="muted">
                      <Lock className="size-3" /> Locked
                    </Badge>
                  )}
                </div>

                <div className="mt-8">
                  <h4
                    className={cn(
                      "font-display font-normal leading-tight tracking-tight",
                      feature ? "text-3xl" : "text-2xl",
                    )}
                  >
                    {service.name}
                  </h4>
                  <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                    {service.tagline}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent opacity-0 transition-all duration-300 group-hover:gap-2.5 group-hover:opacity-100">
                    {isUnlocked ? "Open module" : "Subscribe"}
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Dot() {
  return <span className="size-1 rounded-full bg-accent/50" />;
}
