"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function ModuleHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
          <span className="h-px w-8 bg-accent/50" />
          <span>Module</span>
        </div>
        <h2 className="font-display mt-3 text-3xl font-normal tracking-tight sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  index = 0,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: number;
  hint?: string;
  index?: number;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-premium"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="size-4 text-muted-foreground/55" />}
      </div>
      <p className="font-display mt-5 text-4xl font-normal leading-none tracking-tight tabular">
        {value}
      </p>
      {(delta !== undefined || hint) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </motion.div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <h3 className="text-base font-medium">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
