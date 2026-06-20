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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
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
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground/70">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
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
