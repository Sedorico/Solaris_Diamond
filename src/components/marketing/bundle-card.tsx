"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, ArrowUpRight } from "lucide-react";
import { type Bundle, bundleListPrice, bundleSavings } from "@/lib/data/bundles";
import { serviceMap } from "@/lib/data/services";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";

export function BundleCard({ bundle, index }: { bundle: Bundle; index: number }) {
  const savings = bundleSavings(bundle);
  const list = bundleListPrice(bundle);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "group relative flex h-full flex-col p-8 transition-shadow duration-500",
        bundle.featured
          ? "bg-primary text-primary-foreground"
          : "bg-card hover:shadow-premium",
      )}
    >
      {/* Top accent rule that draws in on hover */}
      <span
        className={cn(
          "absolute left-0 top-0 h-px w-0 transition-all duration-500 ease-out group-hover:w-full",
          bundle.featured ? "bg-accent" : "bg-accent",
        )}
      />
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "eyebrow",
            bundle.featured ? "text-primary-foreground/60" : "",
          )}
        >
          {String(index + 1).padStart(2, "0")} — {bundle.name.replace(" Bundle", "")}
        </span>
        {bundle.featured && <span className="eyebrow text-accent">Most chosen</span>}
      </div>

      <p
        className={cn(
          "mt-8 text-sm leading-relaxed",
          bundle.featured ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {bundle.tagline}
      </p>

      <div className="mt-8 flex items-baseline gap-1">
        <span className="font-display text-5xl font-medium tabular">
          {formatCurrency(bundle.price)}
        </span>
        <span className={cn("text-sm", bundle.featured ? "text-primary-foreground/60" : "text-muted-foreground")}>
          /mo
        </span>
      </div>
      {savings > 0 && (
        <p className={cn("mt-2 text-xs", bundle.featured ? "text-primary-foreground/60" : "text-muted-foreground")}>
          <span className="line-through">{formatCurrency(list)}</span> · save{" "}
          <span className="text-accent">{formatCurrency(savings)}/mo</span>
        </p>
      )}

      <div
        className={cn(
          "my-8 h-px",
          bundle.featured ? "bg-primary-foreground/15" : "bg-border",
        )}
      />

      <ul className="flex flex-1 flex-col gap-3">
        {bundle.services.map((id, idx) => {
          const svc = serviceMap[id];
          return (
            <li
              key={id}
              className="flex items-center gap-3 text-sm transition-transform duration-300 ease-out group-hover:translate-x-1"
              style={{ transitionDelay: `${idx * 40}ms` }}
            >
              <Check
                className="size-4 shrink-0 text-accent"
                strokeWidth={2.5}
              />
              <span className={bundle.featured ? "text-primary-foreground/90" : "text-foreground/80"}>
                {svc.name}
              </span>
            </li>
          );
        })}
      </ul>

      <Button
        asChild
        size="lg"
        variant={bundle.featured ? "accent" : "outline"}
        className="mt-10 w-full"
        data-cursor-label="Subscribe"
      >
        <Link href={`/checkout?bundle=${bundle.id}`}>
          Choose {bundle.name.replace(" Bundle", "")}
          <ArrowUpRight className="size-4" />
        </Link>
      </Button>
    </motion.div>
  );
}
