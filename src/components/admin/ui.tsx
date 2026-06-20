"use client";

import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Admin
        </p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  format,
  index = 0,
}: {
  label: string;
  value: number | string;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
  format?: (v: number) => string;
  index?: number;
}) {
  const display =
    typeof value === "number" && format ? format(value) : String(value);
  const hasDelta = typeof delta === "number";
  const positive = hasDelta && delta! > 0;
  const negative = hasDelta && delta! < 0;
  const flat = hasDelta && delta === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-accent/30 hover:shadow-premium"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground/60 transition-colors group-hover:bg-accent-soft group-hover:text-accent">
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <p className="mt-4 text-3xl font-semibold leading-none tracking-tight">
        {display}
      </p>

      <div className="mt-3 flex items-center gap-1.5 text-xs">
        {hasDelta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
              positive && "bg-success/15 text-success",
              negative && "bg-destructive/15 text-destructive",
              flat && "bg-secondary text-muted-foreground",
            )}
          >
            {positive && <ArrowUpRight className="size-3" />}
            {negative && <ArrowDownRight className="size-3" />}
            {flat && <Minus className="size-3" />}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </motion.div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-6",
        className,
      )}
    >
      {(title || description || action) && (
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-base font-semibold tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusDot({
  status,
}: {
  status: "operational" | "warning" | "critical" | "unknown";
}) {
  const color =
    status === "operational"
      ? "bg-success"
      : status === "warning"
        ? "bg-warning"
        : status === "critical"
          ? "bg-destructive"
          : "bg-muted-foreground";
  return (
    <span className="relative flex size-2.5">
      <span
        className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", color, status === "operational" && "animate-ping")}
      />
      <span className={cn("relative inline-flex size-2.5 rounded-full", color)} />
    </span>
  );
}

export function LineSparkline({
  data,
  height = 60,
  className,
}: {
  data: { value: number }[];
  height?: number;
  className?: string;
}) {
  if (data.length === 0) {
    return <div style={{ height }} className={cn("w-full", className)} />;
  }
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 100;
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((d.value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      <defs>
        <linearGradient id="spark-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-area)" className="text-accent" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="text-accent"
      />
    </svg>
  );
}

export function AreaChart({
  data,
  format = (v) => String(v),
  height = 220,
  className,
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
  height?: number;
  className?: string;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className={cn("flex items-center justify-center text-sm text-muted-foreground", className)}
      >
        No data yet.
      </div>
    );
  }
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const width = 800;
  const padTop = 16;
  const padBottom = 28;
  const chartH = height - padTop - padBottom;

  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = padTop + chartH - (d.value / max) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `0,${padTop + chartH} ${linePath} ${width},${padTop + chartH}`;

  // Y-axis gridlines (3 levels)
  const gridLines = [0.25, 0.5, 0.75, 1].map((fraction) => ({
    y: padTop + chartH - chartH * fraction,
    value: max * fraction,
  }));

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <defs>
          <linearGradient id="area-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => (
          <line
            key={g.y}
            x1="0"
            x2={width}
            y1={g.y}
            y2={g.y}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="text-foreground"
          />
        ))}

        <polygon points={areaPath} fill="url(#area-grad)" className="text-accent" />
        <polyline
          points={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="text-accent"
        />
      </svg>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        {data.map((d, i) => {
          const show =
            data.length <= 12 ||
            i === 0 ||
            i === data.length - 1 ||
            i % Math.ceil(data.length / 8) === 0;
          return (
            <span key={d.label + i} className={show ? "" : "opacity-0"}>
              {d.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function Donut({
  value,
  max,
  size = 140,
  stroke = 12,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - pct * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-accent transition-all"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <p className="text-xl font-semibold tracking-tight">{label}</p>
        )}
        {sublabel && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}
